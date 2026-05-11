import {
  calculateMonthlySavingNeeded,
  calculateRemainingAmount,
  checkSignificantPriceChange,
  normalizeProductQuery,
  roundMoney
} from '@niyet/core';
import type { ProductQueryRewriteAdapter } from '@niyet/ai';
import type { ProductSearchProvider, ProductSearchResult } from './product-search.js';
import { ProductSearchError } from './product-search.js';
import {
  CreateGoalTrackingGoalInputSchema,
  type CreateGoalTrackingGoalInput
} from './validation.js';
import type {
  GoalPriceAlertRecord,
  GoalTrackingGoalRecord,
  GoalTrackingRepository
} from './types.js';
import { moneyToNumber } from './types.js';

export interface PriceRefreshResult {
  goal: GoalTrackingGoalRecord;
  message: string | null;
  alert: GoalPriceAlertRecord | null;
}

export interface GoalTrackingServiceDependencies {
  repository: GoalTrackingRepository;
  productSearch: ProductSearchProvider;
  queryNormalizer: ProductQueryRewriteAdapter;
  now: () => Date;
}

export class GoalTrackingService {
  private readonly repository: GoalTrackingRepository;
  private readonly productSearch: ProductSearchProvider;
  private readonly queryNormalizer: ProductQueryRewriteAdapter;
  private readonly now: () => Date;

  constructor(dependencies: GoalTrackingServiceDependencies) {
    this.repository = dependencies.repository;
    this.productSearch = dependencies.productSearch;
    this.queryNormalizer = dependencies.queryNormalizer;
    this.now = dependencies.now;
  }

  async listGoals(userId: string): Promise<GoalTrackingGoalRecord[]> {
    return this.repository.goalTrackingGoal.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });
  }

  async getGoal(userId: string, id: string): Promise<GoalTrackingGoalRecord | null> {
    return this.repository.goalTrackingGoal.findFirst({
      where: { id, userId }
    });
  }

  async listAlerts(userId: string, unreadOnly = false): Promise<GoalPriceAlertRecord[]> {
    return this.repository.goalPriceAlert.findMany({
      where: {
        ...(unreadOnly ? { readAt: null } : {}),
        goal: { userId }
      },
      include: { goal: true },
      orderBy: { createdAt: 'desc' }
    });
  }

  async normalizeQuery(rawQuery: string) {
    const llmResult = await this.queryNormalizer.normalizeProductQuery(rawQuery);
    return normalizeProductQuery(rawQuery, llmResult);
  }

  async searchProducts(query: string): Promise<ProductSearchResult[]> {
    return this.productSearch.searchProducts(query);
  }

  async createGoal(
    userId: string,
    rawInput: CreateGoalTrackingGoalInput
  ): Promise<GoalTrackingGoalRecord> {
    const input = CreateGoalTrackingGoalInputSchema.parse(rawInput);
    const now = this.now();

    const goal = await this.repository.goalTrackingGoal.create({
      data: {
        userId,
        goalName: input.goalName,
        rawQuery: input.rawQuery,
        normalizedQuery: input.normalizedQuery,
        category: input.category ?? null,
        selectedProductTitle: input.selectedProductTitle,
        productUrl: input.productUrl,
        productImage: input.productImage ?? null,
        productSource: input.productSource,
        originalPrice: input.price,
        currentPrice: input.price,
        currency: input.currency,
        savedAmount: input.savedAmount,
        targetDate: input.targetDate,
        lastCheckedAt: now,
        status: 'ACTIVE'
      }
    });

    await this.repository.goalPriceHistory.create({
      data: {
        goalId: goal.id,
        checkedAt: now,
        price: input.price,
        currency: input.currency,
        source: input.productSource
      }
    });

    return goal;
  }

  async refreshPrice(userId: string, goalId: string): Promise<PriceRefreshResult> {
    const goal = await this.getGoal(userId, goalId);

    if (!goal) {
      throw new Error('Goal not found.');
    }

    let match: ProductSearchResult | null;

    try {
      match = await this.productSearch.refreshTrackedProductPrice(goal);
    } catch (error) {
      if (error instanceof ProductSearchError) {
        return {
          goal,
          message: friendlyProductSearchError(error),
          alert: null
        };
      }

      throw error;
    }

    if (!match) {
      return {
        goal,
        message: 'Seçili ürün için güncel fiyat bulunamadı. Daha sonra tekrar deneyebilirsin.',
        alert: null
      };
    }

    const now = this.now();
    const oldPrice = moneyToNumber(goal.currentPrice);
    const newPrice = match.price;

    const updatedGoal = await this.repository.goalTrackingGoal.update({
      where: { id: goal.id },
      data: {
        currentPrice: newPrice,
        currency: match.currency,
        productSource: match.source,
        productImage: match.image,
        lastCheckedAt: now
      }
    });

    await this.repository.goalPriceHistory.create({
      data: {
        goalId: goal.id,
        checkedAt: now,
        price: newPrice,
        currency: match.currency,
        source: match.source
      }
    });

    const significantChange = checkSignificantPriceChange(oldPrice, newPrice);
    const alert = significantChange
      ? await this.repository.goalPriceAlert.create({
          data: {
            goalId: goal.id,
            oldPrice,
            newPrice,
            percentageChange: significantChange.percentageChange,
            direction: significantChange.direction,
            remainingAmountImpact: roundMoney(
              calculateRemainingAmount(moneyToNumber(goal.savedAmount), newPrice) -
                calculateRemainingAmount(moneyToNumber(goal.savedAmount), oldPrice)
            ),
            monthlySavingNeeded: calculateMonthlySavingNeeded(
              calculateRemainingAmount(moneyToNumber(goal.savedAmount), newPrice),
              goal.targetDate,
              now
            )
          }
        })
      : null;

    return {
      goal: updatedGoal,
      message: oldPrice === newPrice ? 'Güncel fiyat değişmedi.' : null,
      alert
    };
  }

  async markAlertRead(userId: string, alertId: string): Promise<GoalPriceAlertRecord> {
    const alert = await this.repository.goalPriceAlert.findFirst({
      where: {
        id: alertId,
        goal: { userId }
      }
    });

    if (!alert) {
      throw new Error('Price alert not found.');
    }

    return this.repository.goalPriceAlert.update({
      where: { id: alert.id },
      data: { readAt: this.now() }
    });
  }
}

function friendlyProductSearchError(error: ProductSearchError): string {
  switch (error.code) {
    case 'MISSING_API_KEY':
      return 'Ürün fiyatı servisi yapılandırılmamış.';
    case 'RATE_LIMITED':
      return 'Fiyat servisi geçici olarak yoğun. Biraz sonra tekrar deneyebilirsin.';
    case 'EMPTY_RESULTS':
      return 'Bu ürün için güncel fiyat bulunamadı.';
    case 'PRICE_PARSE_FAILED':
      return 'Ürün fiyatı okunamadı.';
    case 'NETWORK_ERROR':
    case 'UPSTREAM_ERROR':
      return 'Fiyat servisine şu anda ulaşılamıyor.';
    default: {
      const exhaustive: never = error.code;
      return exhaustive;
    }
  }
}

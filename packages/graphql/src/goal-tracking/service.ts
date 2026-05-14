import type { PrismaClient } from '@prisma/client';
import {
  calculateMonthlySavingNeeded,
  calculateRemainingAmount,
  checkSignificantPriceChange,
  normalizeProductQuery,
  roundMoney,
} from '@niyet/core';
import type { ProductQueryRewriteAdapter } from '@niyet/ai';

import type { ProductSearchProvider } from './product-search';
import { ProductSearchError } from './product-search';
import { moneyToNumber } from './types';

export interface PriceRefreshResult {
  goal: Awaited<ReturnType<PrismaClient['goal']['update']>>;
  message: string | null;
  alert: Awaited<ReturnType<PrismaClient['goalPriceAlert']['create']>> | null;
}

export interface GoalTrackingServiceDependencies {
  prisma: PrismaClient;
  productSearch: ProductSearchProvider;
  queryNormalizer: ProductQueryRewriteAdapter;
  now: () => Date;
}

export class GoalTrackingService {
  private readonly prisma: PrismaClient;
  private readonly productSearch: ProductSearchProvider;
  private readonly queryNormalizer: ProductQueryRewriteAdapter;
  private readonly now: () => Date;

  constructor(dependencies: GoalTrackingServiceDependencies) {
    this.prisma = dependencies.prisma;
    this.productSearch = dependencies.productSearch;
    this.queryNormalizer = dependencies.queryNormalizer;
    this.now = dependencies.now;
  }

  async listAlerts(userId: string, unreadOnly = false) {
    return this.prisma.goalPriceAlert.findMany({
      where: {
        ...(unreadOnly ? { readAt: null } : {}),
        goal: { userId },
      },
      include: { goal: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async normalizeQuery(rawQuery: string) {
    const llmResult = await this.queryNormalizer.normalizeProductQuery(rawQuery);
    return normalizeProductQuery(rawQuery, llmResult);
  }

  async searchProducts(query: string) {
    return this.productSearch.searchProducts(query);
  }

  async refreshPrice(userId: string, goalId: string): Promise<PriceRefreshResult> {
    const goal = await this.prisma.goal.findFirst({
      where: { id: goalId, userId },
      select: {
        id: true,
        normalizedQuery: true,
        selectedProductTitle: true,
        productUrl: true,
        productSource: true,
        productImage: true,
        currentPrice: true,
        current: true,
        targetDate: true,
      },
    });

    if (!goal) {
      throw new Error('Hedef bulunamadı veya erişim reddedildi.');
    }

    if (!goal.normalizedQuery) {
      return {
        goal: await this.prisma.goal.findUniqueOrThrow({ where: { id: goal.id } }),
        message: 'Bu hedefte fiyat takibi için ürün bilgisi eksik.',
        alert: null,
      };
    }

    let match;
    try {
      match = await this.productSearch.refreshTrackedProductPrice({
        normalizedQuery: goal.normalizedQuery,
        selectedProductTitle: goal.selectedProductTitle,
        productUrl: goal.productUrl,
        productSource: goal.productSource,
      });
    } catch (error) {
      if (error instanceof ProductSearchError) {
        return {
          goal: await this.prisma.goal.findUniqueOrThrow({ where: { id: goal.id } }),
          message: friendlyProductSearchError(error),
          alert: null,
        };
      }
      throw error;
    }

    if (!match) {
      return {
        goal: await this.prisma.goal.findUniqueOrThrow({ where: { id: goal.id } }),
        message: 'Seçili ürün için güncel fiyat bulunamadı. Daha sonra tekrar deneyebilirsin.',
        alert: null,
      };
    }

    const now = this.now();
    const oldPrice = moneyToNumber(goal.currentPrice);
    const newPrice = match.price;

    const updatedGoal = await this.prisma.goal.update({
      where: { id: goal.id },
      data: {
        currentPrice: newPrice,
        currency: match.currency,
        productSource: match.source,
        productImage: match.image,
        lastCheckedAt: now,
      },
    });

    await this.prisma.goalPriceHistory.create({
      data: {
        goalId: goal.id,
        checkedAt: now,
        price: newPrice,
        currency: match.currency,
        source: match.source,
      },
    });

    const significantChange = checkSignificantPriceChange(oldPrice, newPrice);
    const alert = significantChange
      ? await this.prisma.goalPriceAlert.create({
          data: {
            goalId: goal.id,
            oldPrice,
            newPrice,
            percentageChange: significantChange.percentageChange,
            direction: significantChange.direction,
            remainingAmountImpact: roundMoney(
              calculateRemainingAmount(moneyToNumber(goal.current), newPrice) -
                calculateRemainingAmount(moneyToNumber(goal.current), oldPrice),
            ),
            monthlySavingNeeded: calculateMonthlySavingNeeded(
              calculateRemainingAmount(moneyToNumber(goal.current), newPrice),
              goal.targetDate,
              now,
            ),
          },
        })
      : null;

    return {
      goal: updatedGoal,
      message: oldPrice === newPrice ? 'Güncel fiyat değişmedi.' : null,
      alert,
    };
  }

  async markAlertRead(userId: string, alertId: string) {
    const alert = await this.prisma.goalPriceAlert.findFirst({
      where: {
        id: alertId,
        goal: { userId },
      },
    });

    if (!alert) {
      throw new Error('Fiyat alarmı bulunamadı.');
    }

    return this.prisma.goalPriceAlert.update({
      where: { id: alert.id },
      data: { readAt: this.now() },
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

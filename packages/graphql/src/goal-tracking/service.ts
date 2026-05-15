import type { PrismaClient } from '@prisma/client';
import {
  calculateMonthlySavingNeeded,
  calculateNextPriceCheckAt,
  calculatePriceCheckBackoffUntil,
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

export interface PriceRefreshOptions {
  source?: 'manual' | 'cron';
}

export interface PriceRefreshBatchResult {
  checked: number;
  updated: number;
  alerts: number;
  failed: number;
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

  async refreshPrice(
    userId: string,
    goalId: string,
    options: PriceRefreshOptions = {},
  ): Promise<PriceRefreshResult> {
    const goal = await this.prisma.goal.findFirst({
      where: { id: goalId, userId },
      select: {
        id: true,
        userId: true,
        name: true,
        normalizedQuery: true,
        selectedProductTitle: true,
        productUrl: true,
        productSource: true,
        productImage: true,
        currentPrice: true,
        current: true,
        targetDate: true,
        priceCheckFailureCount: true,
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
        await this.recordRefreshFailure(goal.id, goal.priceCheckFailureCount);
        return {
          goal: await this.prisma.goal.findUniqueOrThrow({ where: { id: goal.id } }),
          message: friendlyProductSearchError(error),
          alert: null,
        };
      }
      throw error;
    }

    if (!match) {
      await this.recordRefreshFailure(goal.id, goal.priceCheckFailureCount);
      return {
        goal: await this.prisma.goal.findUniqueOrThrow({ where: { id: goal.id } }),
        message: 'Seçili ürün için güncel fiyat bulunamadı. Daha sonra tekrar deneyebilirsin.',
        alert: null,
      };
    }

    const now = this.now();
    const oldPrice = moneyToNumber(goal.currentPrice);
    const newPrice = match.price;
    const significantChange = checkSignificantPriceChange(oldPrice, newPrice);
    const monthlySavingNeeded = calculateMonthlySavingNeeded(
      calculateRemainingAmount(moneyToNumber(goal.current), newPrice),
      goal.targetDate,
      now,
    );

    const [updatedGoal, alert] = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.goal.update({
        where: { id: goal.id },
        data: {
          currentPrice: newPrice,
          currency: match.currency,
          selectedProductTitle: match.title,
          productUrl: match.url,
          productSource: match.source,
          productImage: match.image,
          lastCheckedAt: now,
          nextPriceCheckAt: calculateNextPriceCheckAt(goal.targetDate, now),
          priceCheckFailureCount: 0,
          priceCheckPausedUntil: null,
        },
      });

      await tx.goalPriceHistory.create({
        data: {
          goalId: goal.id,
          checkedAt: now,
          price: newPrice,
          currency: match.currency,
          source: match.source,
        },
      });

      if (!significantChange) {
        return [updated, null] as const;
      }

      const createdAlert = await tx.goalPriceAlert.create({
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
          monthlySavingNeeded,
        },
      });

      await tx.notification.create({
        data: {
          userId: goal.userId,
          type: 'GOAL_PRICE_ALERT',
          title:
            significantChange.direction === 'INCREASE'
              ? 'Hedef fiyatı arttı'
              : 'Hedef fiyatı düştü',
          body: `${goal.name} hedefi ${Math.round(Math.abs(significantChange.percentageChange) * 100)}% ${significantChange.direction === 'INCREASE' ? 'arttı' : 'düştü'}. Gerekli aylık katkı: ${Math.round(monthlySavingNeeded)} TL.`,
          payload: {
            goalId: goal.id,
            alertId: createdAlert.id,
            oldPrice,
            newPrice,
            percentageChange: significantChange.percentageChange,
            direction: significantChange.direction,
            source: options.source ?? 'manual',
          },
        },
      });

      return [updated, createdAlert] as const;
    });

    return {
      goal: updatedGoal,
      message: oldPrice === newPrice ? 'Güncel fiyat değişmedi.' : null,
      alert,
    };
  }

  async refreshDuePrices(limit = 20, concurrency = 2): Promise<PriceRefreshBatchResult> {
    const now = this.now();
    const goals = await this.prisma.goal.findMany({
      where: {
        status: 'ACTIVE',
        autoUpdate: true,
        normalizedQuery: { not: null },
        OR: [{ nextPriceCheckAt: null }, { nextPriceCheckAt: { lte: now } }],
        AND: [
          {
            OR: [{ priceCheckPausedUntil: null }, { priceCheckPausedUntil: { lte: now } }],
          },
        ],
      },
      select: { id: true, userId: true },
      orderBy: [{ nextPriceCheckAt: 'asc' }, { createdAt: 'asc' }],
      take: limit,
    });

    const result: PriceRefreshBatchResult = {
      checked: goals.length,
      updated: 0,
      alerts: 0,
      failed: 0,
    };

    await runWithConcurrency(goals, Math.max(1, concurrency), async (goal) => {
      try {
        const refresh = await this.refreshPrice(goal.userId, goal.id, { source: 'cron' });
        if (refresh.message) {
          if (refresh.message === 'Güncel fiyat değişmedi.') {
            result.updated += 1;
            return;
          }
          result.failed += 1;
          return;
        }
        result.updated += 1;
        if (refresh.alert) {
          result.alerts += 1;
        }
      } catch {
        result.failed += 1;
      }
    });

    return result;
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

  private async recordRefreshFailure(goalId: string, currentFailureCount: number) {
    const now = this.now();
    const failureCount = currentFailureCount + 1;
    const pausedUntil = calculatePriceCheckBackoffUntil(failureCount, now);

    await this.prisma.goal.update({
      where: { id: goalId },
      data: {
        priceCheckFailureCount: failureCount,
        priceCheckPausedUntil: pausedUntil,
        nextPriceCheckAt: pausedUntil,
      },
    });
  }
}

async function runWithConcurrency<T>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<void>,
) {
  let index = 0;
  const runners = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (index < items.length) {
      const item = items[index];
      index += 1;
      if (item) {
        await worker(item);
      }
    }
  });
  await Promise.all(runners);
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

import { describe, expect, it } from 'vitest';

import { GoalTrackingService } from './service';

const now = new Date('2026-01-01T00:00:00.000Z');
const targetDate = new Date('2026-07-01T00:00:00.000Z');

describe('GoalTrackingService', () => {
  it('creates a price alert and notification when a tracked price increases significantly', async () => {
    const notifications: unknown[] = [];
    const alerts: unknown[] = [];
    const histories: unknown[] = [];
    const updates: unknown[] = [];
    const prisma = fakePrisma({
      oldPrice: 50000,
      newPrice: 55000,
      notifications,
      alerts,
      histories,
      updates,
    });
    const service = new GoalTrackingService({
      prisma,
      productSearch: fakeProductSearch(55000),
      queryNormalizer: { normalizeProductQuery: async () => null },
      now: () => now,
    });

    const result = await service.refreshPrice('user-1', 'goal-1');

    expect(result.alert).not.toBeNull();
    expect(alerts).toHaveLength(1);
    expect(notifications).toHaveLength(1);
    expect(histories).toHaveLength(1);
    expect(updates).toHaveLength(1);
  });

  it('does not create a notification when the tracked price is unchanged', async () => {
    const notifications: unknown[] = [];
    const prisma = fakePrisma({
      oldPrice: 50000,
      newPrice: 50000,
      notifications,
      alerts: [],
      histories: [],
      updates: [],
    });
    const service = new GoalTrackingService({
      prisma,
      productSearch: fakeProductSearch(50000),
      queryNormalizer: { normalizeProductQuery: async () => null },
      now: () => now,
    });

    const result = await service.refreshPrice('user-1', 'goal-1');

    expect(result.alert).toBeNull();
    expect(result.message).toBe('Güncel fiyat değişmedi.');
    expect(notifications).toHaveLength(0);
  });
});

function fakeProductSearch(price: number) {
  return {
    searchProducts: async () => [],
    refreshTrackedProductPrice: async () => ({
      title: 'iPhone 15 128 GB',
      url: 'https://example.com/iphone',
      image: null,
      source: 'Mock Store',
      price,
      currency: 'TRY',
    }),
  };
}

function fakePrisma(options: {
  oldPrice: number;
  newPrice: number;
  notifications: unknown[];
  alerts: unknown[];
  histories: unknown[];
  updates: unknown[];
}) {
  const updatedGoal = {
    id: 'goal-1',
    userId: 'user-1',
    name: 'Yeni telefon',
    currentPrice: options.newPrice,
  };
  const alert = { id: 'alert-1', goalId: 'goal-1', newPrice: options.newPrice };

  const tx = {
    goal: {
      update: async ({ data }: { data: unknown }) => {
        options.updates.push(data);
        return updatedGoal;
      },
    },
    goalPriceHistory: {
      create: async ({ data }: { data: unknown }) => {
        options.histories.push(data);
        return data;
      },
    },
    goalPriceAlert: {
      create: async ({ data }: { data: unknown }) => {
        options.alerts.push(data);
        return alert;
      },
    },
    notification: {
      create: async ({ data }: { data: unknown }) => {
        options.notifications.push(data);
        return data;
      },
    },
  };

  return {
    goal: {
      findFirst: async () => ({
        id: 'goal-1',
        userId: 'user-1',
        name: 'Yeni telefon',
        normalizedQuery: 'iphone 15 128 gb',
        selectedProductTitle: 'iPhone 15 128 GB',
        productUrl: 'https://example.com/iphone',
        productSource: 'Mock Store',
        productImage: null,
        currentPrice: options.oldPrice,
        current: 0,
        targetDate,
        priceCheckFailureCount: 0,
      }),
      findUniqueOrThrow: async () => updatedGoal,
      update: async ({ data }: { data: unknown }) => {
        options.updates.push(data);
        return updatedGoal;
      },
    },
    goalPriceAlert: {
      findMany: async () => [],
      findFirst: async () => null,
      update: async () => alert,
    },
    $transaction: async <T>(callback: (txClient: typeof tx) => Promise<T>) => callback(tx),
  } as never;
}

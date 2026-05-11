import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { createGraphQLYoga } from '../src/server.js';
import { GoalTrackingService } from '../src/goal-tracking/service.js';
import { ProductSearchError, type ProductSearchProvider } from '../src/goal-tracking/product-search.js';
import type {
  GoalPriceAlertRecord,
  GoalTrackingGoalRecord,
  GoalTrackingRepository
} from '../src/goal-tracking/types.js';

const userId = '00000000-0000-4000-8000-000000000001';

describe('goal tracking GraphQL', () => {
  it('rejects unauthenticated mutations', async () => {
    const yoga = createGraphQLYoga({
      prismaClient: createMockRepository() as never,
      productSearch: createProductSearchProvider([]),
      queryNormalizer: { normalizeProductQuery: async () => null }
    });

    const response = await yoga.fetch('http://localhost/graphql', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        query: 'mutation { normalizeGoalProductQuery(rawQuery: "ayfon 15") { normalizedQuery } }'
      })
    });
    const payload = await response.json();

    expect(payload.errors?.[0]).toBeDefined();
    expect(payload.data?.normalizeGoalProductQuery).toBeNull();
  });
});

describe('GoalTrackingService', () => {
  it('creates a goal and initial price history row', async () => {
    const repository = createMockRepository();
    const service = createService(repository, createProductSearchProvider([]));

    const goal = await service.createGoal(userId, {
      goalName: 'Telefon hedefi',
      rawQuery: 'ayfon 15 almak istiyorum',
      normalizedQuery: 'iphone 15',
      category: 'electronics',
      savedAmount: 5000,
      targetDate: new Date('2026-08-09T00:00:00.000Z'),
      selectedProductTitle: 'Apple iPhone 15',
      productUrl: 'https://store.example/iphone-15',
      productImage: 'https://store.example/iphone-15.jpg',
      productSource: 'Example Store',
      price: 45000,
      currency: 'TRY'
    });

    expect(goal.currentPrice).toBe(45000);
    expect(repository.priceHistory).toHaveLength(1);
    expect(repository.priceHistory[0]?.goalId).toBe(goal.id);
  });

  it('refreshes current price, appends history, and creates alert above threshold', async () => {
    const repository = createMockRepository();
    const goal = seedGoal(repository, { currentPrice: 45000, savedAmount: 5000 });
    const service = createService(
      repository,
      createProductSearchProvider([
        {
          title: 'Apple iPhone 15 128 GB',
          url: goal.productUrl,
          image: goal.productImage,
          source: goal.productSource,
          price: 48000,
          currency: 'TRY'
        }
      ])
    );

    const result = await service.refreshPrice(userId, goal.id);

    expect(result.goal.currentPrice).toBe(48000);
    expect(repository.priceHistory).toHaveLength(1);
    expect(result.alert?.direction).toBe('INCREASE');
    expect(repository.alerts).toHaveLength(1);
  });

  it('returns a typed failure message instead of crashing on RapidAPI errors', async () => {
    const repository = createMockRepository();
    const goal = seedGoal(repository, { currentPrice: 45000 });
    const service = createService(repository, {
      searchProducts: async () => {
        throw new ProductSearchError('RATE_LIMITED', 'rate limited');
      },
      refreshTrackedProductPrice: async () => {
        throw new ProductSearchError('RATE_LIMITED', 'rate limited');
      }
    });

    const result = await service.refreshPrice(userId, goal.id);

    expect(result.goal.id).toBe(goal.id);
    expect(result.alert).toBeNull();
    expect(result.message).toContain('yoğun');
  });
});

function createService(repository: MockRepository, productSearch: ProductSearchProvider) {
  return new GoalTrackingService({
    repository,
    productSearch,
    queryNormalizer: { normalizeProductQuery: async () => null },
    now: () => new Date('2026-05-11T00:00:00.000Z')
  });
}

function createProductSearchProvider(results: Awaited<ReturnType<ProductSearchProvider['searchProducts']>>) {
  return {
    searchProducts: async () => results,
    refreshTrackedProductPrice: async () => results[0] ?? null
  } satisfies ProductSearchProvider;
}

interface MockRepository extends GoalTrackingRepository {
  goals: GoalTrackingGoalRecord[];
  alerts: GoalPriceAlertRecord[];
  priceHistory: Array<{ goalId: string; price: number; currency: string; source: string }>;
}

function createMockRepository(): MockRepository {
  const repository: MockRepository = {
    goals: [],
    alerts: [],
    priceHistory: [],
    goalTrackingGoal: {
      findMany: async (args) =>
        repository.goals.filter((goal) => goal.userId === where(args).userId),
      findFirst: async (args) =>
        repository.goals.find(
          (goal) =>
            (!where(args).id || goal.id === where(args).id) &&
            (!where(args).userId || goal.userId === where(args).userId)
        ) ?? null,
      create: async (args) => {
        const data = dataOf(args);
        const goal = {
          id: randomUUID(),
          createdAt: new Date(),
          updatedAt: new Date(),
          ...data
        } as GoalTrackingGoalRecord;
        repository.goals.push(goal);
        return goal;
      },
      update: async (args) => {
        const id = where(args).id;
        const index = repository.goals.findIndex((goal) => goal.id === id);
        if (index < 0) {
          throw new Error('goal not found');
        }
        repository.goals[index] = {
          ...repository.goals[index],
          ...dataOf(args),
          updatedAt: new Date()
        };
        return repository.goals[index]!;
      }
    },
    goalPriceHistory: {
      create: async (args) => {
        repository.priceHistory.push(dataOf(args));
        return dataOf(args);
      }
    },
    goalPriceAlert: {
      findMany: async () => repository.alerts,
      findFirst: async (args) =>
        repository.alerts.find((alert) => alert.id === where(args).id) ?? null,
      create: async (args) => {
        const alert = {
          id: randomUUID(),
          createdAt: new Date(),
          readAt: null,
          ...dataOf(args)
        } as GoalPriceAlertRecord;
        repository.alerts.push(alert);
        return alert;
      },
      update: async (args) => {
        const index = repository.alerts.findIndex((alert) => alert.id === where(args).id);
        if (index < 0) {
          throw new Error('alert not found');
        }
        repository.alerts[index] = {
          ...repository.alerts[index],
          ...dataOf(args)
        };
        return repository.alerts[index]!;
      }
    }
  };

  return repository;
}

function seedGoal(
  repository: MockRepository,
  overrides: Partial<GoalTrackingGoalRecord> = {}
): GoalTrackingGoalRecord {
  const goal: GoalTrackingGoalRecord = {
    id: randomUUID(),
    userId,
    goalName: 'Telefon hedefi',
    rawQuery: 'iphone 15',
    normalizedQuery: 'iphone 15',
    category: 'electronics',
    selectedProductTitle: 'Apple iPhone 15',
    productUrl: 'https://store.example/iphone-15',
    productImage: 'https://store.example/iphone-15.jpg',
    productSource: 'Example Store',
    originalPrice: 45000,
    currentPrice: 45000,
    currency: 'TRY',
    savedAmount: 5000,
    targetDate: new Date('2026-08-09T00:00:00.000Z'),
    lastCheckedAt: null,
    status: 'ACTIVE',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides
  };
  repository.goals.push(goal);
  return goal;
}

function where(args: unknown): Record<string, string> {
  return ((args as { where?: Record<string, string> }).where ?? {}) as Record<string, string>;
}

function dataOf<T>(args: unknown): T {
  return (args as { data: T }).data;
}

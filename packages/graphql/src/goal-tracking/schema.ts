import SchemaBuilder from '@pothos/core';
import ScopeAuthPlugin from '@pothos/plugin-scope-auth';
import { GraphQLError } from 'graphql';
import { calculateProgress, calculateRemainingAmount } from '@niyet/core';
import type { ProductQueryNormalization } from '@niyet/core';
import type { GraphQLContext } from '../context.js';
import type { ProductSearchResult } from './product-search.js';
import { GoalTrackingService, type PriceRefreshResult } from './service.js';
import type {
  GoalPriceAlertRecord,
  GoalTrackingGoalRecord,
  GoalTrackingRepository
} from './types.js';
import { moneyToNumber } from './types.js';
import {
  AlertIdInputSchema,
  CreateGoalTrackingGoalInputSchema,
  GoalIdInputSchema,
  NormalizeGoalProductQueryInputSchema,
  SearchGoalProductsInputSchema
} from './validation.js';

type SchemaTypes = {
  Context: GraphQLContext;
  AuthScopes: {
    authenticated: boolean;
  };
};

const builder = new SchemaBuilder<SchemaTypes>({
  plugins: [ScopeAuthPlugin],
  scopeAuth: {
    authScopes: async (context: GraphQLContext) => ({
      authenticated: Boolean(context.user)
    }),
    unauthorizedError: () =>
      new GraphQLError('Authentication required.', {
        extensions: { code: 'UNAUTHENTICATED' }
      })
  }
});

builder.queryType({});
builder.mutationType({});

const GoalStatusEnum = builder.enumType('GoalTrackingGoalStatus', {
  values: ['ACTIVE', 'COMPLETED', 'ARCHIVED'] as const
});

const PriceAlertDirectionEnum = builder.enumType('PriceAlertDirection', {
  values: ['INCREASE', 'DECREASE'] as const
});

const GoalTrackingGoal = builder
  .objectRef<GoalTrackingGoalRecord>('GoalTrackingGoal')
  .implement({
    fields: (t) => ({
      id: t.exposeID('id'),
      goalName: t.exposeString('goalName'),
      rawQuery: t.exposeString('rawQuery'),
      normalizedQuery: t.exposeString('normalizedQuery'),
      category: t.exposeString('category', { nullable: true }),
      selectedProductTitle: t.exposeString('selectedProductTitle'),
      productUrl: t.exposeString('productUrl'),
      productImage: t.exposeString('productImage', { nullable: true }),
      productSource: t.exposeString('productSource'),
      originalPrice: t.float({ resolve: (goal) => moneyToNumber(goal.originalPrice) }),
      currentPrice: t.float({ resolve: (goal) => moneyToNumber(goal.currentPrice) }),
      currency: t.exposeString('currency'),
      savedAmount: t.float({ resolve: (goal) => moneyToNumber(goal.savedAmount) }),
      targetDate: t.string({ resolve: (goal) => goal.targetDate.toISOString() }),
      lastCheckedAt: t.string({
        nullable: true,
        resolve: (goal) => goal.lastCheckedAt?.toISOString() ?? null
      }),
      status: t.field({ type: GoalStatusEnum, resolve: (goal) => goal.status }),
      progress: t.float({
        resolve: (goal) =>
          calculateProgress(moneyToNumber(goal.savedAmount), moneyToNumber(goal.currentPrice))
      }),
      remainingAmount: t.float({
        resolve: (goal) =>
          calculateRemainingAmount(
            moneyToNumber(goal.savedAmount),
            moneyToNumber(goal.currentPrice)
          )
      }),
      createdAt: t.string({ resolve: (goal) => goal.createdAt.toISOString() }),
      updatedAt: t.string({ resolve: (goal) => goal.updatedAt.toISOString() })
    })
  });

const GoalPriceAlert = builder.objectRef<GoalPriceAlertRecord>('GoalPriceAlert').implement({
  fields: (t) => ({
    id: t.exposeID('id'),
    goalId: t.exposeID('goalId'),
    oldPrice: t.float({ resolve: (alert) => moneyToNumber(alert.oldPrice) }),
    newPrice: t.float({ resolve: (alert) => moneyToNumber(alert.newPrice) }),
    percentageChange: t.float({
      resolve: (alert) => moneyToNumber(alert.percentageChange)
    }),
    direction: t.field({
      type: PriceAlertDirectionEnum,
      resolve: (alert) => alert.direction
    }),
    remainingAmountImpact: t.float({
      resolve: (alert) => moneyToNumber(alert.remainingAmountImpact)
    }),
    monthlySavingNeeded: t.float({
      resolve: (alert) => moneyToNumber(alert.monthlySavingNeeded)
    }),
    readAt: t.string({
      nullable: true,
      resolve: (alert) => alert.readAt?.toISOString() ?? null
    }),
    createdAt: t.string({ resolve: (alert) => alert.createdAt.toISOString() }),
    goal: t.field({
      type: GoalTrackingGoal,
      nullable: true,
      resolve: (alert) => alert.goal ?? null
    })
  })
});

const ProductQueryNormalizationObject = builder
  .objectRef<ProductQueryNormalization>('ProductQueryNormalization')
  .implement({
    fields: (t) => ({
      rawQuery: t.exposeString('rawQuery'),
      normalizedQuery: t.exposeString('normalizedQuery'),
      category: t.exposeString('category', { nullable: true }),
      confidence: t.exposeFloat('confidence'),
      source: t.exposeString('source')
    })
  });

const ProductSearchResultObject = builder
  .objectRef<ProductSearchResult>('ProductSearchResult')
  .implement({
    fields: (t) => ({
      title: t.exposeString('title'),
      url: t.exposeString('url'),
      image: t.exposeString('image', { nullable: true }),
      source: t.exposeString('source'),
      price: t.exposeFloat('price'),
      currency: t.exposeString('currency')
    })
  });

const PriceRefreshResultObject = builder.objectRef<PriceRefreshResult>('PriceRefreshResult').implement({
  fields: (t) => ({
    goal: t.field({ type: GoalTrackingGoal, resolve: (result) => result.goal }),
    message: t.exposeString('message', { nullable: true }),
    alert: t.field({
      type: GoalPriceAlert,
      nullable: true,
      resolve: (result) => result.alert
    })
  })
});

const CreateGoalTrackingGoalInput = builder.inputType('CreateGoalTrackingGoalInput', {
  fields: (t) => ({
    goalName: t.string({ required: true }),
    rawQuery: t.string({ required: true }),
    normalizedQuery: t.string({ required: true }),
    category: t.string(),
    savedAmount: t.float({ required: true }),
    targetDate: t.string({ required: true }),
    selectedProductTitle: t.string({ required: true }),
    productUrl: t.string({ required: true }),
    productImage: t.string(),
    productSource: t.string({ required: true }),
    price: t.float({ required: true }),
    currency: t.string({ required: true })
  })
});

builder.queryFields((t) => ({
  goalTrackingGoals: t.field({
    type: [GoalTrackingGoal],
    authScopes: { authenticated: true },
    resolve: (_root, _args, context) =>
      serviceFromContext(context).listGoals(requireUser(context).id)
  }),
  goalTrackingGoal: t.field({
    type: GoalTrackingGoal,
    nullable: true,
    authScopes: { authenticated: true },
    args: {
      id: t.arg.id({ required: true })
    },
    resolve: (_root, args, context) =>
      serviceFromContext(context).getGoal(requireUser(context).id, String(args.id))
  }),
  goalPriceAlerts: t.field({
    type: [GoalPriceAlert],
    authScopes: { authenticated: true },
    args: {
      unreadOnly: t.arg.boolean({ defaultValue: false })
    },
    resolve: (_root, args, context) =>
      serviceFromContext(context).listAlerts(requireUser(context).id, args.unreadOnly ?? false)
  })
}));

builder.mutationFields((t) => ({
  normalizeGoalProductQuery: t.field({
    type: ProductQueryNormalizationObject,
    authScopes: { authenticated: true },
    args: {
      rawQuery: t.arg.string({ required: true })
    },
    resolve: (_root, args, context) => {
      const input = NormalizeGoalProductQueryInputSchema.parse({ rawQuery: args.rawQuery });
      return serviceFromContext(context).normalizeQuery(input.rawQuery);
    }
  }),
  searchGoalProducts: t.field({
    type: [ProductSearchResultObject],
    authScopes: { authenticated: true },
    args: {
      query: t.arg.string({ required: true })
    },
    resolve: (_root, args, context) => {
      const input = SearchGoalProductsInputSchema.parse({ query: args.query });
      return serviceFromContext(context).searchProducts(input.query);
    }
  }),
  createGoalTrackingGoal: t.field({
    type: GoalTrackingGoal,
    authScopes: { authenticated: true },
    args: {
      input: t.arg({ type: CreateGoalTrackingGoalInput, required: true })
    },
    resolve: (_root, args, context) => {
      const input = CreateGoalTrackingGoalInputSchema.parse(args.input);
      return serviceFromContext(context).createGoal(requireUser(context).id, input);
    }
  }),
  refreshGoalTrackedPrice: t.field({
    type: PriceRefreshResultObject,
    authScopes: { authenticated: true },
    args: {
      goalId: t.arg.id({ required: true })
    },
    resolve: (_root, args, context) => {
      const input = GoalIdInputSchema.parse({ goalId: String(args.goalId) });
      return serviceFromContext(context).refreshPrice(requireUser(context).id, input.goalId);
    }
  }),
  markGoalPriceAlertRead: t.field({
    type: GoalPriceAlert,
    authScopes: { authenticated: true },
    args: {
      alertId: t.arg.id({ required: true })
    },
    resolve: (_root, args, context) => {
      const input = AlertIdInputSchema.parse({ alertId: String(args.alertId) });
      return serviceFromContext(context).markAlertRead(requireUser(context).id, input.alertId);
    }
  })
}));

export const schema = builder.toSchema();

export function createGoalTrackingSchema() {
  return schema;
}

function serviceFromContext(context: GraphQLContext): GoalTrackingService {
  return new GoalTrackingService({
    repository: context.prisma as unknown as GoalTrackingRepository,
    productSearch: context.productSearch,
    queryNormalizer: context.queryNormalizer,
    now: context.now
  });
}

function requireUser(context: GraphQLContext) {
  if (!context.user) {
    throw new Error('Authentication required.');
  }

  return context.user;
}

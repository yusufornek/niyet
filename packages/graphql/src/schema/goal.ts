/**
 * Goal + GoalCheckpoint + goal-tracking operations.
 */
import {
  buildGoalSavingsPlan,
  calculateNextPriceCheckAt,
  calculateProgress,
  calculateRemainingAmount,
} from '@niyet/core';

import { builder } from '../builder';
import type { GraphQLContext } from '../context';
import { ProductSearchError } from '../goal-tracking/product-search';
import { GoalTrackingService } from '../goal-tracking/service';
import { moneyToNumber } from '../goal-tracking/types';
import {
  AlertIdInputSchema,
  CreateGoalTrackingInputSchema,
  GoalIdInputSchema,
  NormalizeGoalProductQueryInputSchema,
  SearchGoalProductsInputSchema,
} from '../goal-tracking/validation';
import { fetchLatestTuikInflationRate } from '../inflation/tuik';
import { recomputeAndPersistFutureScore } from '../score/service';
import { GoalStatusRef, PriceAlertDirectionRef } from './enums';

const GoalRef = builder.prismaObject('Goal', {
  fields: (t) => ({
    id: t.exposeID('id'),
    name: t.exposeString('name'),
    basePrice: t.field({ type: 'NonNegativeFloat', resolve: (g) => Number(g.basePrice) }),
    currentPrice: t.field({ type: 'NonNegativeFloat', resolve: (g) => Number(g.currentPrice) }),
    inflationPct: t.field({ type: 'NonNegativeFloat', resolve: (g) => Number(g.inflationPct) }),
    targetDate: t.expose('targetDate', { type: 'DateTime' }),
    current: t.field({ type: 'NonNegativeFloat', resolve: (g) => Number(g.current) }),
    monthlyContribution: t.field({
      type: 'NonNegativeFloat',
      resolve: (g) => Number(g.monthlyContribution),
    }),
    status: t.expose('status', { type: GoalStatusRef }),
    priceHistory: t.field({
      type: 'JSON',
      nullable: true,
      resolve: async (goal, _args, ctx) => {
        const rows = await ctx.prisma.goalPriceHistory.findMany({
          where: { goalId: goal.id },
          orderBy: { checkedAt: 'asc' },
          select: { checkedAt: true, price: true },
        });
        if (rows.length > 0) {
          return rows.map((row) => ({
            date: row.checkedAt.toISOString().slice(0, 10),
            price: moneyToNumber(row.price),
          }));
        }
        return goal.priceHistory;
      },
    }),
    coachContext: t.exposeString('coachContext', { nullable: true }),
    planSummary: t.exposeString('planSummary', { nullable: true }),
    planGeneratedAt: t.expose('planGeneratedAt', { type: 'DateTime', nullable: true }),
    autoUpdate: t.exposeBoolean('autoUpdate'),

    rawQuery: t.exposeString('rawQuery', { nullable: true }),
    normalizedQuery: t.exposeString('normalizedQuery', { nullable: true }),
    category: t.exposeString('category', { nullable: true }),
    selectedProductTitle: t.exposeString('selectedProductTitle', { nullable: true }),
    productUrl: t.exposeString('productUrl', { nullable: true }),
    productImage: t.exposeString('productImage', { nullable: true }),
    productSource: t.exposeString('productSource', { nullable: true }),
    currency: t.exposeString('currency'),
    lastCheckedAt: t.expose('lastCheckedAt', { type: 'DateTime', nullable: true }),
    nextPriceCheckAt: t.expose('nextPriceCheckAt', { type: 'DateTime', nullable: true }),
    trackedProgress: t.float({
      resolve: (goal) =>
        calculateProgress(moneyToNumber(goal.current), moneyToNumber(goal.currentPrice)),
    }),
    trackedRemainingAmount: t.float({
      resolve: (goal) =>
        calculateRemainingAmount(moneyToNumber(goal.current), moneyToNumber(goal.currentPrice)),
    }),

    createdAt: t.expose('createdAt', { type: 'DateTime' }),
    updatedAt: t.expose('updatedAt', { type: 'DateTime' }),
    checkpoints: t.relation('checkpoints'),
  }),
});

builder.prismaObject('GoalCheckpoint', {
  fields: (t) => ({
    id: t.exposeID('id'),
    percent: t.exposeInt('percent'),
    label: t.exposeString('label'),
    reached: t.exposeBoolean('reached'),
    reachedAt: t.expose('reachedAt', { type: 'DateTime', nullable: true }),
  }),
});

const GoalPriceAlertRef = builder.prismaObject('GoalPriceAlert', {
  fields: (t) => ({
    id: t.exposeID('id'),
    goalId: t.exposeString('goalId'),
    oldPrice: t.float({ resolve: (row) => moneyToNumber(row.oldPrice) }),
    newPrice: t.float({ resolve: (row) => moneyToNumber(row.newPrice) }),
    percentageChange: t.float({ resolve: (row) => Number(row.percentageChange) }),
    direction: t.expose('direction', { type: PriceAlertDirectionRef }),
    remainingAmountImpact: t.float({ resolve: (row) => moneyToNumber(row.remainingAmountImpact) }),
    monthlySavingNeeded: t.float({ resolve: (row) => moneyToNumber(row.monthlySavingNeeded) }),
    readAt: t.expose('readAt', { type: 'DateTime', nullable: true }),
    createdAt: t.expose('createdAt', { type: 'DateTime' }),
    goal: t.relation('goal'),
  }),
});

const ProductQueryNormalizationObject = builder.simpleObject('ProductQueryNormalization', {
  fields: (t) => ({
    rawQuery: t.string(),
    normalizedQuery: t.string(),
    category: t.string({ nullable: true }),
    confidence: t.float(),
    source: t.string(),
  }),
});

const ProductSearchResultObject = builder.simpleObject('ProductSearchResult', {
  fields: (t) => ({
    title: t.string(),
    url: t.string(),
    image: t.string({ nullable: true }),
    source: t.string(),
    price: t.float(),
    currency: t.string(),
  }),
});

const PriceRefreshResultObject = builder.simpleObject('GoalPriceRefreshResult', {
  fields: (t) => ({
    goal: t.field({ type: GoalRef }),
    message: t.string({ nullable: true }),
    alert: t.field({ type: GoalPriceAlertRef, nullable: true }),
  }),
});

const InflationRateObject = builder.simpleObject('InflationRate', {
  fields: (t) => ({
    annualRate: t.float(),
    monthlyRate: t.float({ nullable: true }),
    period: t.string(),
    publishedAt: t.field({ type: 'DateTime' }),
    source: t.string(),
    sourceUrl: t.string(),
  }),
});

// Queries
builder.queryField('goals', (t) =>
  t.prismaField({
    type: ['Goal'],
    authScopes: { authenticated: true },
    resolve: async (query, _root, _args, ctx) => {
      return ctx.prisma.goal.findMany({
        ...query,
        where: { userId: ctx.userId! },
        orderBy: { createdAt: 'desc' },
      });
    },
  }),
);

builder.queryField('goal', (t) =>
  t.prismaField({
    type: 'Goal',
    nullable: true,
    authScopes: { authenticated: true },
    args: { id: t.arg.id({ required: true }) },
    resolve: async (query, _root, args, ctx) => {
      return ctx.prisma.goal.findFirst({
        ...query,
        where: { id: String(args.id), userId: ctx.userId! },
      });
    },
  }),
);

builder.queryField('goalPriceAlerts', (t) =>
  t.field({
    type: [GoalPriceAlertRef],
    authScopes: { authenticated: true },
    args: { unreadOnly: t.arg.boolean({ defaultValue: false }) },
    resolve: async (_root, args, ctx) => {
      return serviceFromContext(ctx).listAlerts(ctx.userId!, args.unreadOnly ?? false);
    },
  }),
);

builder.queryField('latestInflationRate', (t) =>
  t.field({
    type: InflationRateObject,
    nullable: true,
    authScopes: { authenticated: true },
    resolve: async () => {
      try {
        return await fetchLatestTuikInflationRate();
      } catch {
        return null;
      }
    },
  }),
);

// Mutations
const GoalTrackingInputType = builder.inputType('GoalTrackingInput', {
  fields: (t) => ({
    rawQuery: t.string({ required: true }),
    normalizedQuery: t.string({ required: true }),
    category: t.string(),
    selectedProductTitle: t.string({ required: true }),
    productUrl: t.string({ required: true }),
    productImage: t.string(),
    productSource: t.string({ required: true }),
    price: t.float({ required: true }),
    currency: t.string(),
  }),
});

const GoalInputType = builder.inputType('GoalInput', {
  fields: (t) => ({
    name: t.string({ required: true }),
    basePrice: t.float({ required: true }),
    targetDate: t.field({ type: 'DateTime', required: true }),
    inflationPct: t.float(),
    monthlyContribution: t.float({ defaultValue: 0 }),
    tracking: t.field({ type: GoalTrackingInputType }),
  }),
});

builder.mutationField('createGoal', (t) =>
  t.prismaField({
    type: 'Goal',
    authScopes: { authenticated: true },
    args: { input: t.arg({ type: GoalInputType, required: true }) },
    resolve: async (query, _root, args, ctx) => {
      const input = args.input;
      const tracking = input.tracking ? CreateGoalTrackingInputSchema.parse(input.tracking) : null;
      const now = ctx.now();
      const targetPrice = tracking?.price ?? input.basePrice;
      const inflationRate =
        input.inflationPct ?? (await fetchLatestTuikInflationRate())?.annualRate ?? 32;
      const stats = await getGoalPlanStats(ctx);
      const plan = buildGoalSavingsPlan({
        targetPrice,
        currentAmount: 0,
        targetDate: input.targetDate,
        monthlyIncome: stats.monthlyIncome,
        last30dOpportunity: stats.last30dOpportunity,
        acceptedContributionsLast30d: stats.acceptedContributionsLast30d,
        now,
      });
      const aiSummary =
        (await ctx.goalPlanNarrator.summarizeGoalPlan({
          goalName: input.name,
          targetPrice,
          monthlyIncome: stats.monthlyIncome,
          last30dOpportunity: stats.last30dOpportunity,
          acceptedContributionsLast30d: stats.acceptedContributionsLast30d,
          plan,
        })) ?? plan.summary;

      const goal = await ctx.prisma.goal.create({
        ...query,
        data: {
          userId: ctx.userId!,
          name: input.name,
          basePrice: input.basePrice,
          currentPrice: targetPrice,
          inflationPct: inflationRate,
          targetDate: input.targetDate,
          current: 0,
          monthlyContribution: plan.suggestedMonthlyContribution,
          status: 'ACTIVE',
          autoUpdate: true,
          rawQuery: tracking?.rawQuery ?? null,
          normalizedQuery: tracking?.normalizedQuery ?? null,
          category: tracking?.category ?? null,
          selectedProductTitle: tracking?.selectedProductTitle ?? null,
          productUrl: tracking?.productUrl ?? null,
          productImage: tracking?.productImage ?? null,
          productSource: tracking?.productSource ?? null,
          currency: tracking?.currency ?? 'TRY',
          lastCheckedAt: tracking ? now : null,
          nextPriceCheckAt: tracking ? calculateNextPriceCheckAt(input.targetDate, now) : null,
          planSummary: aiSummary,
          planGeneratedAt: now,
        },
      });

      await ctx.prisma.goalCheckpoint.createMany({
        data: [10, 25, 50, 75].map((pct) => ({
          goalId: goal.id,
          percent: pct,
          label:
            pct === 10
              ? 'İlk %10'
              : pct === 25
                ? 'Çeyrek yol'
                : pct === 50
                  ? 'Yarı yol'
                  : 'Son düzlük',
        })),
      });

      if (tracking) {
        await ctx.prisma.goalPriceHistory.create({
          data: {
            goalId: goal.id,
            checkedAt: now,
            price: tracking.price,
            currency: tracking.currency,
            source: tracking.productSource,
          },
        });
      }
      await recomputeAndPersistFutureScore(ctx, ctx.userId!, 'GOAL_CHANGED');

      return goal;
    },
  }),
);

async function getGoalPlanStats(ctx: GraphQLContext) {
  const since30 = new Date(ctx.now());
  since30.setDate(since30.getDate() - 30);
  const [user, transactions, contributions] = await Promise.all([
    ctx.prisma.user.findUniqueOrThrow({
      where: { id: ctx.userId! },
      select: { monthlyIncome: true },
    }),
    ctx.prisma.transaction.findMany({
      where: { userId: ctx.userId!, occurredAt: { gte: since30 } },
      select: { opportunity: true },
    }),
    ctx.prisma.microContribution.findMany({
      where: {
        userId: ctx.userId!,
        createdAt: { gte: since30 },
        status: { not: 'REVERSED' },
      },
      select: { amount: true },
    }),
  ]);

  return {
    monthlyIncome: moneyToNumber(user.monthlyIncome),
    last30dOpportunity: transactions.reduce(
      (sum, tx) => sum + (tx.opportunity != null ? moneyToNumber(tx.opportunity) : 0),
      0,
    ),
    acceptedContributionsLast30d: contributions.reduce(
      (sum, contribution) => sum + moneyToNumber(contribution.amount),
      0,
    ),
  };
}

const GoalUpdateInputType = builder.inputType('GoalUpdateInput', {
  fields: (t) => ({
    name: t.string(),
    monthlyContribution: t.float(),
    inflationPct: t.float(),
    autoUpdate: t.boolean(),
    coachContext: t.string(),
  }),
});

builder.mutationField('updateGoal', (t) =>
  t.prismaField({
    type: 'Goal',
    authScopes: { authenticated: true },
    args: {
      id: t.arg.id({ required: true }),
      input: t.arg({ type: GoalUpdateInputType, required: true }),
    },
    resolve: async (query, _root, args, ctx) => {
      const goal = await ctx.prisma.goal.findFirst({
        where: { id: String(args.id), userId: ctx.userId! },
        select: { id: true },
      });
      if (!goal) throw new Error('Hedef bulunamadı veya erişim reddedildi.');

      const data: Record<string, unknown> = {};
      const input = args.input;
      if (input.name !== undefined && input.name !== null) data.name = input.name;
      if (input.monthlyContribution !== undefined && input.monthlyContribution !== null) {
        data.monthlyContribution = input.monthlyContribution;
      }
      if (input.inflationPct !== undefined && input.inflationPct !== null)
        data.inflationPct = input.inflationPct;
      if (input.autoUpdate !== undefined && input.autoUpdate !== null)
        data.autoUpdate = input.autoUpdate;
      if (input.coachContext !== undefined && input.coachContext !== null)
        data.coachContext = input.coachContext;

      const updatedGoal = await ctx.prisma.goal.update({
        ...query,
        where: { id: String(args.id) },
        data,
      });
      await recomputeAndPersistFutureScore(ctx, ctx.userId!, 'GOAL_CHANGED');
      return updatedGoal;
    },
  }),
);

builder.mutationField('normalizeGoalProductQuery', (t) =>
  t.field({
    type: ProductQueryNormalizationObject,
    authScopes: { authenticated: true },
    args: { rawQuery: t.arg.string({ required: true }) },
    resolve: (_root, args, ctx) => {
      const input = NormalizeGoalProductQueryInputSchema.parse({ rawQuery: args.rawQuery });
      return serviceFromContext(ctx).normalizeQuery(input.rawQuery);
    },
  }),
);

builder.mutationField('searchGoalProducts', (t) =>
  t.field({
    type: [ProductSearchResultObject],
    authScopes: { authenticated: true },
    args: { query: t.arg.string({ required: true }) },
    resolve: async (_root, args, ctx) => {
      const input = SearchGoalProductsInputSchema.parse({ query: args.query });
      try {
        return await serviceFromContext(ctx).searchProducts(input.query);
      } catch (error) {
        if (error instanceof ProductSearchError) {
          return [];
        }
        throw error;
      }
    },
  }),
);

builder.mutationField('refreshGoalTrackedPrice', (t) =>
  t.field({
    type: PriceRefreshResultObject,
    authScopes: { authenticated: true },
    args: { goalId: t.arg.id({ required: true }) },
    resolve: (_root, args, ctx) => {
      const input = GoalIdInputSchema.parse({ goalId: String(args.goalId) });
      return serviceFromContext(ctx).refreshPrice(ctx.userId!, input.goalId);
    },
  }),
);

builder.mutationField('markGoalPriceAlertRead', (t) =>
  t.prismaField({
    type: GoalPriceAlertRef,
    authScopes: { authenticated: true },
    args: { alertId: t.arg.id({ required: true }) },
    resolve: async (query, _root, args, ctx) => {
      const input = AlertIdInputSchema.parse({ alertId: String(args.alertId) });
      const alert = await serviceFromContext(ctx).markAlertRead(ctx.userId!, input.alertId);
      return ctx.prisma.goalPriceAlert.findUniqueOrThrow({
        ...query,
        where: { id: alert.id },
      });
    },
  }),
);

function serviceFromContext(ctx: GraphQLContext) {
  return new GoalTrackingService({
    prisma: ctx.prisma,
    productSearch: ctx.productSearch,
    queryNormalizer: ctx.queryNormalizer,
    now: ctx.now,
  });
}

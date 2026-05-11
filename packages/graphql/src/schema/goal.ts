/**
 * Goal + GoalCheckpoint + mutations.
 */
import { builder } from '../builder';
import { GoalStatusRef } from './enums';

builder.prismaObject('Goal', {
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
    priceHistory: t.expose('priceHistory', { type: 'JSON', nullable: true }),
    coachContext: t.exposeString('coachContext', { nullable: true }),
    autoUpdate: t.exposeBoolean('autoUpdate'),
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

// ─────────────────────────────────────────────────────────────
// Queries
// ─────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────
// Mutations
// ─────────────────────────────────────────────────────────────

const GoalInputType = builder.inputType('GoalInput', {
  fields: (t) => ({
    name: t.string({ required: true }),
    basePrice: t.float({ required: true }),
    targetDate: t.field({ type: 'DateTime', required: true }),
    inflationPct: t.float({ defaultValue: 32 }),
    monthlyContribution: t.float({ defaultValue: 0 }),
  }),
});

builder.mutationField('createGoal', (t) =>
  t.prismaField({
    type: 'Goal',
    authScopes: { authenticated: true },
    args: { input: t.arg({ type: GoalInputType, required: true }) },
    resolve: async (query, _root, args, ctx) => {
      const input = args.input;
      const goal = await ctx.prisma.goal.create({
        ...query,
        data: {
          userId: ctx.userId!,
          name: input.name,
          basePrice: input.basePrice,
          currentPrice: input.basePrice,
          inflationPct: input.inflationPct ?? 32,
          targetDate: input.targetDate,
          current: 0,
          monthlyContribution: input.monthlyContribution ?? 0,
          status: 'ACTIVE',
          autoUpdate: true,
        },
      });
      // Default 4 checkpoint
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
      return goal;
    },
  }),
);

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
      if (input.monthlyContribution !== undefined && input.monthlyContribution !== null)
        data.monthlyContribution = input.monthlyContribution;
      if (input.inflationPct !== undefined && input.inflationPct !== null)
        data.inflationPct = input.inflationPct;
      if (input.autoUpdate !== undefined && input.autoUpdate !== null)
        data.autoUpdate = input.autoUpdate;
      if (input.coachContext !== undefined && input.coachContext !== null)
        data.coachContext = input.coachContext;
      return ctx.prisma.goal.update({
        ...query,
        where: { id: String(args.id) },
        data,
      });
    },
  }),
);

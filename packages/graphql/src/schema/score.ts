/**
 * FutureScoreSnapshot + score insight query'leri.
 */
import { builder } from '../builder';
import { ensureFutureScore, getFutureScoreInsights } from '../score/service';

builder.prismaObject('FutureScoreSnapshot', {
  fields: (t) => ({
    id: t.exposeID('id'),
    score: t.exposeInt('score'),
    contribution: t.exposeInt('contribution'),
    discipline: t.exposeInt('discipline'),
    consistency: t.exposeInt('consistency'),
    social: t.exposeInt('social'),
    computedAt: t.expose('computedAt', { type: 'DateTime' }),
  }),
});

const FutureScoreSnapshotLite = builder.simpleObject('FutureScoreSnapshotLite', {
  fields: (t) => ({
    id: t.id(),
    score: t.int(),
    contribution: t.int(),
    discipline: t.int(),
    consistency: t.int(),
    social: t.int(),
    computedAt: t.field({ type: 'DateTime' }),
  }),
});

const ScoreDriverDirectionRef = builder.enumType('ScoreDriverDirection', {
  values: ['UP', 'DOWN', 'FLAT'] as const,
});

const FutureScoreDriver = builder.simpleObject('FutureScoreDriver', {
  fields: (t) => ({
    metric: t.string(),
    delta: t.int(),
    direction: t.field({ type: ScoreDriverDirectionRef }),
  }),
});

const UserBadge = builder.simpleObject('UserBadge', {
  fields: (t) => ({
    key: t.string(),
    title: t.string(),
    unlockedAt: t.field({ type: 'DateTime' }),
  }),
});

const FutureScoreInsights = builder.simpleObject('FutureScoreInsights', {
  fields: (t) => ({
    current: t.field({ type: FutureScoreSnapshotLite, nullable: true }),
    previous: t.field({ type: FutureScoreSnapshotLite, nullable: true }),
    delta: t.int(),
    label: t.string(),
    status: t.string(),
    topDriver: t.field({ type: FutureScoreDriver }),
    badges: t.field({ type: [UserBadge] }),
  }),
});

builder.queryField('futureScore', (t) =>
  t.prismaField({
    type: 'FutureScoreSnapshot',
    nullable: true,
    authScopes: { authenticated: true },
    description: "Kullanıcının en güncel Future Score snapshot'ı",
    resolve: async (query, _root, _args, ctx) => {
      const userId = ctx.userId!;
      await ensureFutureScore(ctx, userId);
      return ctx.prisma.futureScoreSnapshot.findFirst({
        ...query,
        where: { userId },
        orderBy: { computedAt: 'desc' },
      });
    },
  }),
);

builder.queryField('futureScoreHistory', (t) =>
  t.prismaField({
    type: ['FutureScoreSnapshot'],
    authScopes: { authenticated: true },
    args: { limit: t.arg.int({ defaultValue: 10 }) },
    resolve: async (query, _root, args, ctx) => {
      return ctx.prisma.futureScoreSnapshot.findMany({
        ...query,
        where: { userId: ctx.userId! },
        orderBy: { computedAt: 'desc' },
        take: args.limit ?? 10,
      });
    },
  }),
);

builder.queryField('futureScoreInsights', (t) =>
  t.field({
    type: FutureScoreInsights,
    authScopes: { authenticated: true },
    resolve: async (_root, _args, ctx) => {
      return getFutureScoreInsights(ctx, ctx.userId!);
    },
  }),
);

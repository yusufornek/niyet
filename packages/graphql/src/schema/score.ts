/**
 * FutureScoreSnapshot tipi + futureScore query.
 */
import { builder } from '../builder';

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

builder.queryField('futureScore', (t) =>
  t.prismaField({
    type: 'FutureScoreSnapshot',
    nullable: true,
    authScopes: { authenticated: true },
    description: "Kullanıcının en güncel Future Score snapshot'ı",
    resolve: async (query, _root, _args, ctx) => {
      return ctx.prisma.futureScoreSnapshot.findFirst({
        ...query,
        where: { userId: ctx.userId! },
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

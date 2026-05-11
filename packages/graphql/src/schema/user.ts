/**
 * User tipi + `me` query.
 */
import { builder } from '../builder';

builder.prismaObject('User', {
  fields: (t) => ({
    id: t.exposeID('id'),
    email: t.exposeString('email'),
    name: t.exposeString('name'),
    age: t.exposeInt('age'),
    monthlyIncome: t.field({
      type: 'NonNegativeFloat',
      resolve: (u) => Number(u.monthlyIncome),
    }),
    createdAt: t.expose('createdAt', { type: 'DateTime' }),
    consentAcceptedAt: t.expose('consentAcceptedAt', { type: 'DateTime', nullable: true }),

    accounts: t.relation('accounts'),
    goals: t.relation('goals'),
    subscriptions: t.relation('subscriptions'),
    rules: t.relation('rules'),
    notifications: t.relation('notifications'),
  }),
});

builder.queryField('me', (t) =>
  t.prismaField({
    type: 'User',
    nullable: true,
    authScopes: { authenticated: true },
    description: 'Authenticated kullanıcının profili (demo akışında Ayşe)',
    resolve: async (query, _root, _args, ctx) => {
      if (!ctx.userId) return null;
      return ctx.prisma.user.findUnique({
        ...query,
        where: { id: ctx.userId },
      });
    },
  }),
);

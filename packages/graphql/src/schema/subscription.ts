/**
 * Subscription tipi + query.
 */
import { builder } from '../builder';
import { RuleFrequencyRef, SubscriptionStatusRef } from './enums';

builder.prismaObject('Subscription', {
  fields: (t) => ({
    id: t.exposeID('id'),
    name: t.exposeString('name'),
    amount: t.field({ type: 'NonNegativeFloat', resolve: (s) => Number(s.amount) }),
    frequency: t.expose('frequency', { type: RuleFrequencyRef }),
    status: t.expose('status', { type: SubscriptionStatusRef }),
    detectedAt: t.expose('detectedAt', { type: 'DateTime' }),
    lastChargedAt: t.expose('lastChargedAt', { type: 'DateTime', nullable: true }),
    merchantPattern: t.exposeString('merchantPattern', { nullable: true }),
  }),
});

builder.queryField('subscriptions', (t) =>
  t.prismaField({
    type: ['Subscription'],
    authScopes: { authenticated: true },
    resolve: async (query, _root, _args, ctx) => {
      return ctx.prisma.subscription.findMany({
        ...query,
        where: { userId: ctx.userId! },
        orderBy: { detectedAt: 'desc' },
      });
    },
  }),
);

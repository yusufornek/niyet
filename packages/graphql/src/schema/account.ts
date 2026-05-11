/**
 * Account + BankConnection + Rule tipleri.
 */
import { builder } from '../builder';
import { AccountTypeRef, RuleFrequencyRef } from './enums';

builder.prismaObject('Account', {
  fields: (t) => ({
    id: t.exposeID('id'),
    type: t.expose('type', { type: AccountTypeRef }),
    last4: t.exposeString('last4'),
    nickname: t.exposeString('nickname', { nullable: true }),
    balance: t.field({ type: 'NonNegativeFloat', resolve: (a) => Number(a.balance) }),
    bankConn: t.relation('bankConn'),
  }),
});

builder.prismaObject('BankConnection', {
  fields: (t) => ({
    id: t.exposeID('id'),
    bankName: t.exposeString('bankName'),
    connectedAt: t.expose('connectedAt', { type: 'DateTime' }),
    disconnectedAt: t.expose('disconnectedAt', { type: 'DateTime', nullable: true }),
    active: t.exposeBoolean('active'),
    accounts: t.relation('accounts'),
  }),
});

builder.prismaObject('Rule', {
  fields: (t) => ({
    id: t.exposeID('id'),
    label: t.exposeString('label'),
    amount: t.field({ type: 'NonNegativeFloat', resolve: (r) => Number(r.amount) }),
    frequency: t.expose('frequency', { type: RuleFrequencyRef }),
    active: t.exposeBoolean('active'),
    createdAt: t.expose('createdAt', { type: 'DateTime' }),
  }),
});

builder.queryField('rules', (t) =>
  t.prismaField({
    type: ['Rule'],
    authScopes: { authenticated: true },
    resolve: async (query, _root, _args, ctx) => {
      return ctx.prisma.rule.findMany({
        ...query,
        where: { userId: ctx.userId! },
        orderBy: { createdAt: 'desc' },
      });
    },
  }),
);

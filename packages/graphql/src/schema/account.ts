/**
 * Account + BankConnection + Rule tipleri + bank connection mutation'lari.
 */
import { z } from 'zod';

import { builder } from '../builder';
import {
  BankConnectionService,
  SUPPORTED_BANKS,
  type SupportedBank,
} from '../bank-connection/service';
import { AccountTypeRef, RuleFrequencyRef } from './enums';

builder.prismaObject('Account', {
  fields: (t) => ({
    id: t.exposeID('id'),
    type: t.expose('type', { type: AccountTypeRef }),
    last4: t.exposeString('last4'),
    nickname: t.exposeString('nickname', { nullable: true }),
    /// Kredi karti negatif olabilir, NonNegativeFloat yerine Float.
    balance: t.float({ resolve: (a) => Number(a.balance) }),
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

// ─────────────────────────────────────────────────────────────
// Bank Connection — queries + mutations (PBI: banka/kart bagla)
// ─────────────────────────────────────────────────────────────

const SupportedBankRef = builder.enumType('SupportedBank', {
  description: 'Niyet demo modunda destekleyen banka listesi.',
  values: SUPPORTED_BANKS as readonly string[] as readonly SupportedBank[],
});

const ConnectBankResultRef = builder.simpleObject('ConnectBankResult', {
  description: 'connectBank mutation sonucu — yeni baglanti + olusturulan mock veri.',
  fields: (t) => ({
    bankConnectionId: t.id(),
    accountId: t.id(),
    transactionsCreated: t.int(),
    last4: t.string(),
  }),
});

builder.queryField('myBankConnections', (t) =>
  t.prismaField({
    type: ['BankConnection'],
    authScopes: { authenticated: true },
    description: 'Kullanicinin aktif banka baglantilari (en yeni once).',
    resolve: async (query, _root, _args, ctx) => {
      return ctx.prisma.bankConnection.findMany({
        ...query,
        where: { userId: ctx.userId!, active: true },
        orderBy: { connectedAt: 'desc' },
      });
    },
  }),
);

builder.queryField('supportedBanks', (t) =>
  t.field({
    type: [SupportedBankRef],
    description: 'Destekleyen banka listesi (UI baglantı sayfasi icin).',
    resolve: () => SUPPORTED_BANKS,
  }),
);

const ConnectBankInputSchema = z.object({
  bankName: z.enum(SUPPORTED_BANKS as [SupportedBank, ...SupportedBank[]]),
  accountType: z.enum(['DEBIT', 'CREDIT_CARD', 'CHECKING', 'SAVINGS']).optional(),
  nickname: z.string().min(1).max(40).optional(),
});

builder.mutationField('connectBank', (t) =>
  t.field({
    type: ConnectBankResultRef,
    authScopes: { authenticated: true },
    description:
      'Bir banka/karti bagla. NOT: Gercek banka API entegrasyonu yok (Open Banking lisansi gerek). MockBankConnectionAdapter ile DB"ye gercek BankConnection + Account + son 30 gun islem yazilir; demo akisi uctan uca calisir.',
    args: {
      bankName: t.arg({ type: SupportedBankRef, required: true }),
      accountType: t.arg({ type: AccountTypeRef, required: false }),
      nickname: t.arg.string({ required: false }),
    },
    resolve: async (_root, args, ctx) => {
      ConnectBankInputSchema.parse({
        bankName: args.bankName,
        accountType: args.accountType ?? undefined,
        nickname: args.nickname ?? undefined,
      });
      const service = new BankConnectionService({
        prisma: ctx.prisma,
        now: ctx.now,
      });
      return service.connect({
        userId: ctx.userId!,
        bankName: args.bankName,
        accountType: args.accountType ?? 'DEBIT',
        nickname: args.nickname ?? undefined,
      });
    },
  }),
);

builder.mutationField('disconnectBank', (t) =>
  t.boolean({
    authScopes: { authenticated: true },
    description:
      'Bir banka baglantisini pasif yap. Hesap ve islem gecmisi SILINMEZ; sadece active=false + disconnectedAt set.',
    args: { id: t.arg.id({ required: true }) },
    resolve: async (_root, args, ctx) => {
      const service = new BankConnectionService({
        prisma: ctx.prisma,
        now: ctx.now,
      });
      return service.disconnect(ctx.userId!, String(args.id));
    },
  }),
);

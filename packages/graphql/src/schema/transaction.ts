/**
 * Transaction tipi + query'ler + editTransactionCategory mutation.
 */
import type { SpendingCategory } from '@prisma/client';
import { projectSavingsHorizon } from '@niyet/core';

import { builder } from '../builder';
import { recomputeAndPersistFutureScore } from '../score/service';
import { PeriodEnum, SpendingCategoryRef } from './enums';

builder.prismaObject('Transaction', {
  fields: (t) => ({
    id: t.exposeID('id'),
    amount: t.field({
      type: 'NonNegativeFloat',
      resolve: (tx) => Number(tx.amount),
    }),
    merchant: t.exposeString('merchant'),
    description: t.exposeString('description', { nullable: true }),
    occurredAt: t.expose('occurredAt', { type: 'DateTime' }),
    category: t.expose('category', { type: SpendingCategoryRef }),
    categoryEdited: t.exposeBoolean('categoryEdited'),
    isRecurring: t.exposeBoolean('isRecurring'),
    isReducible: t.exposeBoolean('isReducible'),
    opportunity: t.field({
      type: 'NonNegativeFloat',
      nullable: true,
      resolve: (tx) => (tx.opportunity != null ? Number(tx.opportunity) : null),
    }),
    /// Bu TX katkıya dönüştürüldü mü (acceptedContributionId set mi)
    isAccepted: t.boolean({
      resolve: (tx) => tx.acceptedContributionId != null,
    }),
    acceptedContribution: t.relation('acceptedContribution', { nullable: true }),
    account: t.relation('account'),
  }),
});

// ─────────────────────────────────────────────────────────────
// Queries
// ─────────────────────────────────────────────────────────────

function periodToDateRange(period: 'LAST_7D' | 'LAST_30D' | 'LAST_90D' | 'ALL'): Date | undefined {
  if (period === 'ALL') return undefined;
  const d = new Date();
  const days = period === 'LAST_7D' ? 7 : period === 'LAST_30D' ? 30 : 90;
  d.setDate(d.getDate() - days);
  return d;
}

builder.queryField('transactions', (t) =>
  t.prismaField({
    type: ['Transaction'],
    authScopes: { authenticated: true },
    args: {
      period: t.arg({ type: PeriodEnum, defaultValue: 'LAST_90D' }),
      category: t.arg({ type: SpendingCategoryRef, required: false }),
      take: t.arg.int({ defaultValue: 100 }),
      skip: t.arg.int({ defaultValue: 0 }),
    },
    resolve: async (query, _root, args, ctx) => {
      const since = periodToDateRange(args.period as 'LAST_7D' | 'LAST_30D' | 'LAST_90D' | 'ALL');
      return ctx.prisma.transaction.findMany({
        ...query,
        where: {
          userId: ctx.userId!,
          ...(since ? { occurredAt: { gte: since } } : {}),
          ...(args.category ? { category: args.category } : {}),
        },
        orderBy: { occurredAt: 'desc' },
        take: args.take ?? 100,
        skip: args.skip ?? 0,
      });
    },
  }),
);

// Category breakdown — aggregate query
const CategoryBreakdown = builder.simpleObject('CategoryBreakdown', {
  fields: (t) => ({
    category: t.field({ type: SpendingCategoryRef }),
    total: t.float(),
    opportunity: t.float(),
    avg: t.float(),
    count: t.int(),
  }),
});

builder.queryField('categoryBreakdown', (t) =>
  t.field({
    type: [CategoryBreakdown],
    authScopes: { authenticated: true },
    args: {
      period: t.arg({ type: PeriodEnum, defaultValue: 'LAST_30D' }),
    },
    resolve: async (_root, args, ctx) => {
      const since = periodToDateRange(args.period as 'LAST_7D' | 'LAST_30D' | 'LAST_90D' | 'ALL');
      const txs = await ctx.prisma.transaction.findMany({
        where: {
          userId: ctx.userId!,
          ...(since ? { occurredAt: { gte: since } } : {}),
        },
        select: { category: true, amount: true, opportunity: true },
      });

      const map = new Map<
        SpendingCategory,
        { total: number; opportunity: number; count: number }
      >();
      for (const tx of txs) {
        const cur = map.get(tx.category) ?? { total: 0, opportunity: 0, count: 0 };
        cur.total += Number(tx.amount);
        cur.opportunity += tx.opportunity != null ? Number(tx.opportunity) : 0;
        cur.count += 1;
        map.set(tx.category, cur);
      }

      return Array.from(map.entries())
        .map(([category, v]) => ({
          category,
          total: Math.round(v.total),
          opportunity: Math.round(v.opportunity),
          avg: v.count > 0 ? Math.round(v.total / v.count) : 0,
          count: v.count,
        }))
        .sort((a, b) => b.total - a.total);
    },
  }),
);

// Dashboard aggregate — UI'ın ana sayfası için tek query
const DashboardStats = builder.simpleObject('DashboardStats', {
  fields: (t) => ({
    totalSpentLast30d: t.float(),
    totalOpportunityLast30d: t.float(),
    txCountLast30d: t.int(),
    weeklySaved: t.float(),
    activeRulesCount: t.int(),
    activeGoalsCount: t.int(),
    /// Tüm zamanların kabul edilmiş katkı toplamı (REVERSED hariç)
    totalAcceptedContributions: t.float(),
    /// Son 30 günde kabul edilmiş katkı toplamı
    acceptedContributionsLast30d: t.float(),
    /// Bugün (00:00'dan itibaren) açılan tasarruf fırsatı toplamı
    todayOpportunity: t.float(),
  }),
});

builder.queryField('dashboard', (t) =>
  t.field({
    type: DashboardStats,
    authScopes: { authenticated: true },
    resolve: async (_root, _args, ctx) => {
      const userId = ctx.userId!;
      const since30 = new Date();
      since30.setDate(since30.getDate() - 30);
      const since7 = new Date();
      since7.setDate(since7.getDate() - 7);

      const sinceToday = new Date();
      sinceToday.setHours(0, 0, 0, 0);

      const [txs30, txs7, txsToday, rulesCount, goalsCount, allContribs, contribs30] =
        await Promise.all([
          ctx.prisma.transaction.findMany({
            where: { userId, occurredAt: { gte: since30 } },
            select: { amount: true, opportunity: true },
          }),
          ctx.prisma.transaction.findMany({
            where: { userId, occurredAt: { gte: since7 } },
            select: { opportunity: true },
          }),
          ctx.prisma.transaction.findMany({
            where: { userId, occurredAt: { gte: sinceToday } },
            select: { opportunity: true },
          }),
          ctx.prisma.rule.count({ where: { userId, active: true } }),
          ctx.prisma.goal.count({ where: { userId, status: 'ACTIVE' } }),
          ctx.prisma.microContribution.findMany({
            where: { userId, status: { not: 'REVERSED' } },
            select: { amount: true },
          }),
          ctx.prisma.microContribution.findMany({
            where: {
              userId,
              status: { not: 'REVERSED' },
              createdAt: { gte: since30 },
            },
            select: { amount: true },
          }),
        ]);

      const sumOpportunity = (rows: Array<{ opportunity: unknown }>) =>
        rows.reduce((s, t) => s + (t.opportunity != null ? Number(t.opportunity) : 0), 0);

      return {
        totalSpentLast30d: Math.round(txs30.reduce((s, t) => s + Number(t.amount), 0)),
        totalOpportunityLast30d: Math.round(sumOpportunity(txs30)),
        txCountLast30d: txs30.length,
        weeklySaved: Math.round(sumOpportunity(txs7)),
        todayOpportunity: Math.round(sumOpportunity(txsToday)),
        activeRulesCount: rulesCount,
        activeGoalsCount: goalsCount,
        totalAcceptedContributions: Math.round(
          allContribs.reduce((s, c) => s + Number(c.amount), 0),
        ),
        acceptedContributionsLast30d: Math.round(
          contribs30.reduce((s, c) => s + Number(c.amount), 0),
        ),
      };
    },
  }),
);

// ─────────────────────────────────────────────────────────────
// Savings projection — PBI: bugünkü küçük tasarrufun aylık/yıllık/uzun vadeli etkisi
// ─────────────────────────────────────────────────────────────

const SavingsHorizonPointType = builder.simpleObject('SavingsHorizonPoint', {
  description: 'Uzun vadeli compound noktası (5/10/30 yıl gibi)',
  fields: (t) => ({
    years: t.int(),
    totalAmount: t.float(),
    totalContributed: t.float(),
    growth: t.float(),
  }),
});

const SavingsProjectionType = builder.simpleObject('SavingsProjection', {
  description:
    'Bugünkü tasarruf fırsatının aylık → yıllık → uzun vadeli (compound) projeksiyonu. ' +
    'Demo aşamasında basit FV-of-annuity formülü; yatırım tavsiyesi değildir.',
  fields: (t) => ({
    /// Bugün için referans alınan günlük tasarruf tutarı (TL)
    todayAmount: t.float(),
    /// Bugünkü davranış 30 gün devam ederse aylık birikim (todayAmount × 30)
    monthlyAmount: t.float(),
    /// Bugünkü davranış bir yıl devam ederse yıllık birikim (monthlyAmount × 12)
    yearlyAmount: t.float(),
    /// Compound noktaları (default 5/10/30 yıl)
    horizon: t.field({ type: [SavingsHorizonPointType] }),
    /// Hesapta kullanılan yıllık nominal getiri oranı (% — default 5)
    annualReturnPct: t.float(),
    /// `todayAmount` 0 ise son 7 günün ortalaması fallback olarak kullanıldı mı?
    isEstimated: t.boolean(),
  }),
});

builder.queryField('savingsProjection', (t) =>
  t.field({
    type: SavingsProjectionType,
    authScopes: { authenticated: true },
    args: {
      /// %5 default (Türkiye reel getiri varsayımı). Slider için açık.
      annualReturnPct: t.arg.float({ required: false, defaultValue: 5 }),
    },
    resolve: async (_root, args, ctx) => {
      const userId = ctx.userId!;
      const sinceToday = new Date();
      sinceToday.setHours(0, 0, 0, 0);
      const since7 = new Date();
      since7.setDate(since7.getDate() - 7);

      const [txsToday, txs7] = await Promise.all([
        ctx.prisma.transaction.findMany({
          where: { userId, occurredAt: { gte: sinceToday } },
          select: { opportunity: true },
        }),
        ctx.prisma.transaction.findMany({
          where: { userId, occurredAt: { gte: since7 } },
          select: { opportunity: true },
        }),
      ]);

      const sumOpp = (rows: Array<{ opportunity: unknown }>) =>
        rows.reduce((s, t) => s + (t.opportunity != null ? Number(t.opportunity) : 0), 0);

      const todayRaw = sumOpp(txsToday);
      let todayAmount = todayRaw;
      let isEstimated = false;
      // Demo edge: bugün hiç fırsat yoksa son 7 günden günlük ortalama göster
      if (todayRaw <= 0) {
        const weeklyOpp = sumOpp(txs7);
        if (weeklyOpp > 0) {
          todayAmount = weeklyOpp / 7;
          isEstimated = true;
        }
      }

      const projection = projectSavingsHorizon({
        todayAmount,
        annualReturnPct: args.annualReturnPct ?? 5,
      });

      return {
        ...projection,
        isEstimated,
      };
    },
  }),
);

// ─────────────────────────────────────────────────────────────
// Mutations
// ─────────────────────────────────────────────────────────────

builder.mutationField('editTransactionCategory', (t) =>
  t.prismaField({
    type: 'Transaction',
    authScopes: { authenticated: true },
    description: 'Kullanıcı yanlış kategoriyi düzeltir; categoryEdited true olur.',
    args: {
      id: t.arg.id({ required: true }),
      category: t.arg({ type: SpendingCategoryRef, required: true }),
    },
    resolve: async (query, _root, args, ctx) => {
      // Authorization: tx kullanıcıya ait mi?
      const tx = await ctx.prisma.transaction.findUnique({
        where: { id: String(args.id) },
        select: { userId: true },
      });
      if (!tx || tx.userId !== ctx.userId) {
        throw new Error('Transaction bulunamadı veya erişim reddedildi.');
      }
      const updated = await ctx.prisma.transaction.update({
        ...query,
        where: { id: String(args.id) },
        data: { category: args.category, categoryEdited: true },
      });
      await recomputeAndPersistFutureScore(ctx, ctx.userId!, 'TRANSACTION_CHANGED');
      return updated;
    },
  }),
);

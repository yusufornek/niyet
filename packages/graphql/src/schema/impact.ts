/**
 * User Impact Summary — "Niyet bana ne katti?" aggregate query.
 *
 * PBI: "Toplam katkimi, skor artisimi ve yillik katki potansiyelimi gormek
 * istiyorum; boylece Niyet'in bana sagladigi degeri net sekilde anlayabilirim."
 *
 * Tasarim notu:
 * - Mevcut 4 ayri query'i (contributionSummary + futureScoreInsights +
 *   savingsProjection + categoryBreakdown) tek RTT'de birlestirir.
 * - Composite read-model query — DB'ye yazmaz, side-effect yok.
 * - Hesaplamalar mevcut core fn'leri ve service'leri reuse eder (DRY).
 */
import { projectSavingsHorizon } from '@niyet/core';

import { builder } from '../builder';
import { getFutureScoreInsights } from '../score/service';
import { SpendingCategoryRef } from './enums';
import { FutureScoreDriverRef } from './score';

const ImpactCategoryOpportunity = builder.simpleObject('ImpactCategoryOpportunity', {
  description: 'En guclu 3 azaltilabilir kategori.',
  fields: (t) => ({
    category: t.field({ type: SpendingCategoryRef }),
    opportunity: t.float({ description: 'Son 30 gunluk azaltilabilir tutar (TL).' }),
    monthlyTotalSpent: t.float({ description: 'Son 30 gun kategori toplami (TL).' }),
  }),
});

const UserImpactSummary = builder.simpleObject('UserImpactSummary', {
  description: 'Kullanicinin Niyet uzerinden elde ettigi toplam degerin ozeti.',
  fields: (t) => ({
    /// Iadeler haric tum zamanlardaki COMMITTED + PENDING toplami
    totalContributedAllTime: t.float(),
    /// COMMITTED MicroContribution sayisi
    contributionCount: t.int(),
    /// Son 30 gunde eklenen katki tutari
    last30dContributed: t.float(),

    /// En guncel score (yoksa null)
    currentScore: t.int({ nullable: true }),
    /// Onceki snapshot'a gore delta (yoksa 0)
    scoreDelta: t.int(),
    /// Skoru en cok hareket ettiren faktor (null degil — getFutureScoreInsights default veriyor)
    topDriver: t.field({ type: FutureScoreDriverRef }),

    /// Bugun (veya son 7 gun fallback) azaltilabilir tutar
    todayOpportunity: t.float(),
    /// Aylik mikro katki potansiyeli (bugun * 30, basit)
    monthlyPotential: t.float(),
    /// Yillik mikro katki potansiyeli (compound, %5 default getiri)
    yearlyPotential: t.float(),
    /// Bugunkun katki bu tempoyla 30 yil tutulursa toplam (TL — compound)
    thirtyYearProjection: t.float(),

    /// En guclu 3 azaltilabilir kategori
    topCategoryOpportunities: t.field({ type: [ImpactCategoryOpportunity] }),

    /// Sosyal aktivite metrikleri
    activeGoalCount: t.int(),
    circleCount: t.int(),
  }),
});

builder.queryField('myImpactSummary', (t) =>
  t.field({
    type: UserImpactSummary,
    authScopes: { authenticated: true },
    description:
      'Kullanicinin Niyet uzerinden bugune kadar elde ettigi toplam degerin tek shot ozeti.',
    resolve: async (_root, _args, ctx) => {
      const userId = ctx.userId!;
      const now = ctx.now();
      const sinceToday = new Date(now);
      sinceToday.setHours(0, 0, 0, 0);
      const since7 = new Date(now);
      since7.setDate(since7.getDate() - 7);
      const since30 = new Date(now);
      since30.setDate(since30.getDate() - 30);

      const [
        contribs,
        contribs30d,
        scoreInsights,
        txsToday,
        txs7,
        txs30,
        goalsActive,
        circleMemberships,
      ] = await Promise.all([
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
        getFutureScoreInsights(ctx, userId),
        ctx.prisma.transaction.findMany({
          where: { userId, occurredAt: { gte: sinceToday } },
          select: { opportunity: true },
        }),
        ctx.prisma.transaction.findMany({
          where: { userId, occurredAt: { gte: since7 } },
          select: { opportunity: true },
        }),
        ctx.prisma.transaction.findMany({
          where: { userId, occurredAt: { gte: since30 } },
          select: { amount: true, category: true, opportunity: true },
        }),
        ctx.prisma.goal.count({
          where: { userId, status: 'ACTIVE' },
        }),
        ctx.prisma.circleMembership.count({
          where: { userId },
        }),
      ]);

      // Toplam katki — REVERSED haric
      const totalContributedAllTime = round0(contribs.reduce((s, c) => s + Number(c.amount), 0));
      const last30dContributed = round0(contribs30d.reduce((s, c) => s + Number(c.amount), 0));

      // Bugunku firsat (savingsProjection ile ayni mantik — son 7 gun fallback)
      const sumOpp = (rows: Array<{ opportunity: unknown }>) =>
        rows.reduce((s, t) => s + (t.opportunity != null ? Number(t.opportunity) : 0), 0);
      const todayRaw = sumOpp(txsToday);
      let todayOpportunity = todayRaw;
      if (todayRaw <= 0) {
        const weekly = sumOpp(txs7);
        if (weekly > 0) todayOpportunity = weekly / 7;
      }

      const projection = projectSavingsHorizon({
        todayAmount: todayOpportunity,
        annualReturnPct: 5,
      });
      const thirtyYearPoint = projection.horizon.find((p) => p.years === 30) ?? null;

      // Top 3 kategori azaltilabilir (son 30 gun)
      const catMap = new Map<
        string,
        { category: string; totalSpent: number; opportunity: number }
      >();
      for (const tx of txs30) {
        const key = tx.category;
        const entry = catMap.get(key) ?? {
          category: key,
          totalSpent: 0,
          opportunity: 0,
        };
        entry.totalSpent += Number(tx.amount);
        entry.opportunity += tx.opportunity != null ? Number(tx.opportunity) : 0;
        catMap.set(key, entry);
      }
      const topCategoryOpportunities = [...catMap.values()]
        .filter((c) => c.opportunity > 0)
        .sort((a, b) => b.opportunity - a.opportunity)
        .slice(0, 3)
        .map((c) => ({
          category: c.category as Parameters<typeof Object>[0] as never,
          opportunity: round0(c.opportunity),
          monthlyTotalSpent: round0(c.totalSpent),
        }));

      return {
        totalContributedAllTime,
        contributionCount: contribs.length,
        last30dContributed,
        currentScore: scoreInsights.current?.score ?? null,
        scoreDelta: scoreInsights.delta,
        topDriver: scoreInsights.topDriver,
        todayOpportunity: round0(todayOpportunity),
        monthlyPotential: projection.monthlyAmount,
        yearlyPotential: projection.yearlyAmount,
        thirtyYearProjection: thirtyYearPoint?.totalAmount ?? 0,
        topCategoryOpportunities,
        activeGoalCount: goalsActive,
        circleCount: circleMemberships,
      };
    },
  }),
);

function round0(n: number): number {
  return Math.round(n);
}

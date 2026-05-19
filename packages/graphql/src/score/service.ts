import { computeFutureScore, scoreLabel } from '@niyet/core';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';

import type { GraphQLContext } from '../context';

export type ScoreRecomputeReason =
  | 'CONTRIBUTION_CHANGED'
  | 'GOAL_CHANGED'
  | 'SUBSCRIPTION_CHANGED'
  | 'ANALYSIS_CHANGED'
  | 'TRANSACTION_CHANGED'
  | 'CRON_REFRESH';

type ScoreSnapshot = {
  id: string;
  score: number;
  contribution: number;
  discipline: number;
  consistency: number;
  social: number;
  computedAt: Date;
};

type BadgeRow = {
  badgeKey: string;
  unlockedAt: Date;
};

const BADGE_DEFS = [
  { key: 'ILK_KATKI', title: 'İlk Katkı', rule: (m: Metrics) => m.totalContributions >= 1 },
  {
    key: 'UC_AY_SERI_KATKI',
    title: '3 Ay Ritmi',
    rule: (m: Metrics) => m.consecutiveContributionMonths >= 3,
  },
  {
    key: 'ALTI_AY_SERI_KATKI',
    title: '6 Ay Disiplin',
    rule: (m: Metrics) => m.consecutiveContributionMonths >= 6,
  },
  { key: 'SKOR_60', title: 'Skor 60+', rule: (_m: Metrics, s: ScoreSnapshot) => s.score >= 60 },
  { key: 'SKOR_80', title: 'Skor 80+', rule: (_m: Metrics, s: ScoreSnapshot) => s.score >= 80 },
] as const;

type BadgeKey = (typeof BADGE_DEFS)[number]['key'];

type Metrics = {
  recentContributionCount: number;
  activeRulesCount: number;
  reducibleSpendingChange: number;
  activeGoalsCount: number;
  consecutiveContributionMonths: number;
  circleMembershipCount: number;
  totalContributions: number;
};

export type ScoreInsights = {
  current: ScoreSnapshot | null;
  previous: ScoreSnapshot | null;
  delta: number;
  label: string;
  status: string;
  topDriver: { metric: string; delta: number; direction: 'UP' | 'DOWN' | 'FLAT' };
  badges: Array<{ key: string; title: string; unlockedAt: Date }>;
};

export async function recomputeAndPersistFutureScore(
  ctx: GraphQLContext,
  userId: string,
  reason: ScoreRecomputeReason,
) {
  const now = ctx.now();
  const previous = await ctx.prisma.futureScoreSnapshot.findFirst({
    where: { userId },
    orderBy: { computedAt: 'desc' },
  });

  const metrics = await collectMetrics(ctx, userId, now);
  const computed = computeFutureScore(metrics);

  const snapshot = await ctx.prisma.futureScoreSnapshot.create({
    data: {
      userId,
      score: computed.score,
      contribution: computed.contribution,
      discipline: computed.discipline,
      consistency: computed.consistency,
      social: computed.social,
      computedAt: now,
    },
  });

  const unlocked = await unlockBadges(ctx, userId, metrics, snapshot);
  await maybeCreateMilestoneNotification(ctx, userId, previous, snapshot, reason, unlocked);
  return snapshot;
}

/**
 * Mevcut snapshot 1 saatten yeni ise reuse eder; aksi takdirde recompute
 * tetikler. Demo'da kullanıcı anında güncel skor görsün diye agresif TTL.
 * Cron `refreshFutureScoresDaily` ayrıca günlük baseline yenileme yapar.
 */
const FUTURE_SCORE_TTL_MS = 60 * 60 * 1000; // 1 saat

export async function ensureFutureScore(ctx: GraphQLContext, userId: string) {
  const latest = await ctx.prisma.futureScoreSnapshot.findFirst({
    where: { userId },
    orderBy: { computedAt: 'desc' },
  });
  if (latest && ctx.now().getTime() - latest.computedAt.getTime() < FUTURE_SCORE_TTL_MS) {
    return latest;
  }
  return recomputeAndPersistFutureScore(ctx, userId, 'CRON_REFRESH');
}

export async function getFutureScoreInsights(
  ctx: GraphQLContext,
  userId: string,
): Promise<ScoreInsights> {
  await ensureFutureScore(ctx, userId);
  const snapshots = await ctx.prisma.futureScoreSnapshot.findMany({
    where: { userId },
    orderBy: { computedAt: 'desc' },
    take: 2,
  });
  const current = snapshots[0] ?? null;
  const previous = snapshots[1] ?? null;
  const delta = current && previous ? current.score - previous.score : 0;
  const { label, status } = scoreLabel(current?.score ?? 0);
  const topDriver = deriveTopDriver(current, previous);
  const badges = await listBadges(ctx, userId);
  return { current, previous, delta, label, status, topDriver, badges };
}

export async function recomputeFutureScoresForAllUsers(ctx: GraphQLContext) {
  const users = await ctx.prisma.user.findMany({ select: { id: true } });
  let updated = 0;
  for (const user of users) {
    await recomputeAndPersistFutureScore(ctx, user.id, 'CRON_REFRESH');
    updated++;
  }
  return { updated };
}

async function collectMetrics(ctx: GraphQLContext, userId: string, now: Date): Promise<Metrics> {
  const since28 = new Date(now);
  since28.setDate(since28.getDate() - 28);
  const since30 = new Date(now);
  since30.setDate(since30.getDate() - 30);
  const since60 = new Date(now);
  since60.setDate(since60.getDate() - 60);

  const [
    recentContributionCount,
    totalContributions,
    activeRulesCount,
    activeGoalsCount,
    circleMembershipCount,
    contributionsForStreak,
    tx30,
    txPrev30,
  ] = await Promise.all([
    ctx.prisma.microContribution.count({
      where: { userId, status: { not: 'REVERSED' }, createdAt: { gte: since28 } },
    }),
    ctx.prisma.microContribution.count({ where: { userId, status: { not: 'REVERSED' } } }),
    ctx.prisma.rule.count({ where: { userId, active: true } }),
    ctx.prisma.goal.count({ where: { userId, status: 'ACTIVE' } }),
    ctx.prisma.circleMembership.count({ where: { userId } }),
    ctx.prisma.microContribution.findMany({
      where: { userId, status: { not: 'REVERSED' } },
      select: { createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 36,
    }),
    ctx.prisma.transaction.findMany({
      where: { userId, isReducible: true, occurredAt: { gte: since30, lte: now } },
      select: { amount: true },
    }),
    ctx.prisma.transaction.findMany({
      where: { userId, isReducible: true, occurredAt: { gte: since60, lt: since30 } },
      select: { amount: true },
    }),
  ]);

  const currentReducible = tx30.reduce((sum, tx) => sum + Number(tx.amount), 0);
  const previousReducible = txPrev30.reduce((sum, tx) => sum + Number(tx.amount), 0);
  const reducibleSpendingChange =
    previousReducible > 0 ? (currentReducible - previousReducible) / previousReducible : 0;

  return {
    recentContributionCount,
    activeRulesCount,
    reducibleSpendingChange,
    activeGoalsCount,
    consecutiveContributionMonths: computeMonthStreak(contributionsForStreak, now),
    circleMembershipCount,
    totalContributions,
  };
}

function computeMonthStreak(rows: Array<{ createdAt: Date }>, now: Date): number {
  if (rows.length === 0) return 0;
  const monthSet = new Set(
    rows.map(
      (r) =>
        `${r.createdAt.getUTCFullYear()}-${String(r.createdAt.getUTCMonth() + 1).padStart(2, '0')}`,
    ),
  );
  let streak = 0;
  const cursor = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  for (let i = 0; i < 24; i++) {
    const key = `${cursor.getUTCFullYear()}-${String(cursor.getUTCMonth() + 1).padStart(2, '0')}`;
    if (!monthSet.has(key)) break;
    streak++;
    cursor.setUTCMonth(cursor.getUTCMonth() - 1);
  }
  return streak;
}

function deriveTopDriver(current: ScoreSnapshot | null, previous: ScoreSnapshot | null) {
  if (!current || !previous) return { metric: 'İlk skor', delta: 0, direction: 'FLAT' as const };
  const diffs = [
    { metric: 'Düzenli katkı', delta: current.contribution - previous.contribution },
    { metric: 'Harcama disiplini', delta: current.discipline - previous.discipline },
    { metric: 'Katkı sürekliliği', delta: current.consistency - previous.consistency },
    { metric: 'Sosyal katılım', delta: current.social - previous.social },
  ];
  diffs.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
  const top = diffs[0] ?? { metric: 'Stabil', delta: 0 };
  const direction: 'UP' | 'DOWN' | 'FLAT' = top.delta > 0 ? 'UP' : top.delta < 0 ? 'DOWN' : 'FLAT';
  return {
    metric: top.metric,
    delta: top.delta,
    direction,
  };
}

async function unlockBadges(
  ctx: GraphQLContext,
  userId: string,
  metrics: Metrics,
  snapshot: ScoreSnapshot,
): Promise<Array<{ key: BadgeKey; title: string }>> {
  const existing = await listBadges(ctx, userId);
  const existingKeys = new Set(existing.map((b) => b.key));
  const toUnlock = BADGE_DEFS.filter((b) => !existingKeys.has(b.key) && b.rule(metrics, snapshot));
  if (toUnlock.length === 0) return [];
  for (const badge of toUnlock) {
    try {
      await ctx.prisma.$executeRaw(
        Prisma.sql`INSERT INTO "UserBadge" ("id", "userId", "badgeKey", "unlockedAt")
                   VALUES (${randomUUID()}, ${userId}, ${badge.key}, now())
                   ON CONFLICT ("userId", "badgeKey") DO NOTHING`,
      );
    } catch {
      return [];
    }
  }
  return toUnlock.map((b) => ({ key: b.key, title: b.title }));
}

async function listBadges(ctx: GraphQLContext, userId: string) {
  let rows: BadgeRow[] = [];
  try {
    rows = await ctx.prisma.$queryRaw<BadgeRow[]>(
      Prisma.sql`SELECT "badgeKey", "unlockedAt"
                 FROM "UserBadge"
                 WHERE "userId" = ${userId}
                 ORDER BY "unlockedAt" ASC`,
    );
  } catch {
    return [];
  }
  return rows.map((row) => ({
    key: row.badgeKey,
    unlockedAt: new Date(row.unlockedAt),
    title: BADGE_DEFS.find((b) => b.key === row.badgeKey)?.title ?? row.badgeKey,
  }));
}

async function maybeCreateMilestoneNotification(
  ctx: GraphQLContext,
  userId: string,
  previous: ScoreSnapshot | null,
  current: ScoreSnapshot,
  reason: ScoreRecomputeReason,
  unlocked: Array<{ key: BadgeKey; title: string }>,
) {
  for (const badge of unlocked) {
    await ctx.prisma.notification.create({
      data: {
        userId,
        type: 'AI_INSIGHT',
        title: 'Yeni rozet açıldı',
        body: `${badge.title} rozetini kazandın.`,
        payload: { badgeKey: badge.key, reason },
      },
    });
  }

  const crossed60 = (previous?.score ?? 0) < 60 && current.score >= 60;
  const crossed80 = (previous?.score ?? 0) < 80 && current.score >= 80;
  if (!crossed60 && !crossed80) return;
  const milestone = crossed80 ? 80 : 60;
  await ctx.prisma.notification.create({
    data: {
      userId,
      type: 'AI_INSIGHT',
      title: 'Skor seviyen yükseldi',
      body: `Gelecek skorun ${milestone} eşiğini geçti.`,
      payload: { milestone, reason },
    },
  });
}

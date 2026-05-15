/**
 * Subscription tipi + queries + mutations.
 *
 * Lifecycle:
 *   ACTIVE  → kullanıcı kullanıyor, sadece görüntüleme
 *   CANCELLABLE → kullanıcı işaretledi, iptal aday
 *   CANCELED → kullanıcı iptal etti, yıllık tutarı katkıya aktarıldı
 */
import { builder } from '../builder';
import { recomputeAndPersistFutureScore } from '../score/service';
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
    /// Yıllık maliyet (amount × 12)
    yearlyAmount: t.field({
      type: 'NonNegativeFloat',
      resolve: (s) => Number(s.amount) * 12,
    }),
  }),
});

const SubscriptionSummary = builder.simpleObject('SubscriptionSummary', {
  description: 'Abonelik dashboard widget özeti',
  fields: (t) => ({
    activeCount: t.int(),
    cancellableCount: t.int(),
    canceledCount: t.int(),
    /// ACTIVE'lerin aylık toplamı
    activeMonthlyTotal: t.float(),
    /// ACTIVE'lerin yıllık toplamı
    activeYearlyTotal: t.float(),
    /// CANCELLABLE'lerin aylık toplamı (potansiyel tasarruf)
    potentialMonthlySavings: t.float(),
    /// CANCELLABLE'lerin yıllık toplamı
    potentialYearlySavings: t.float(),
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
        orderBy: [{ status: 'asc' }, { amount: 'desc' }],
      });
    },
  }),
);

builder.queryField('subscription', (t) =>
  t.prismaField({
    type: 'Subscription',
    nullable: true,
    authScopes: { authenticated: true },
    args: { id: t.arg.id({ required: true }) },
    resolve: async (query, _root, args, ctx) => {
      return ctx.prisma.subscription.findFirst({
        ...query,
        where: { id: String(args.id), userId: ctx.userId! },
      });
    },
  }),
);

builder.queryField('subscriptionSummary', (t) =>
  t.field({
    type: SubscriptionSummary,
    authScopes: { authenticated: true },
    resolve: async (_root, _args, ctx) => {
      const subs = await ctx.prisma.subscription.findMany({
        where: { userId: ctx.userId! },
        select: { status: true, amount: true },
      });
      const acc = {
        activeCount: 0,
        cancellableCount: 0,
        canceledCount: 0,
        activeMonthlyTotal: 0,
        activeYearlyTotal: 0,
        potentialMonthlySavings: 0,
        potentialYearlySavings: 0,
      };
      for (const s of subs) {
        const amt = Number(s.amount);
        if (s.status === 'ACTIVE') {
          acc.activeCount++;
          acc.activeMonthlyTotal += amt;
          acc.activeYearlyTotal += amt * 12;
        } else if (s.status === 'CANCELLABLE') {
          acc.cancellableCount++;
          acc.potentialMonthlySavings += amt;
          acc.potentialYearlySavings += amt * 12;
        } else {
          acc.canceledCount++;
        }
      }
      return {
        activeCount: acc.activeCount,
        cancellableCount: acc.cancellableCount,
        canceledCount: acc.canceledCount,
        activeMonthlyTotal: Math.round(acc.activeMonthlyTotal),
        activeYearlyTotal: Math.round(acc.activeYearlyTotal),
        potentialMonthlySavings: Math.round(acc.potentialMonthlySavings),
        potentialYearlySavings: Math.round(acc.potentialYearlySavings),
      };
    },
  }),
);

// ─────────────────────────────────────────────────────────────
// Mutations
// ─────────────────────────────────────────────────────────────

builder.mutationField('markSubscriptionStatus', (t) =>
  t.prismaField({
    type: 'Subscription',
    authScopes: { authenticated: true },
    description: 'Kullanıcı bir aboneliği ACTIVE veya CANCELLABLE olarak işaretler.',
    args: {
      id: t.arg.id({ required: true }),
      status: t.arg({ type: SubscriptionStatusRef, required: true }),
    },
    resolve: async (query, _root, args, ctx) => {
      const userId = ctx.userId!;
      if (args.status === 'CANCELED') {
        throw new Error("CANCELED durumu için cancelSubscription mutation'unu kullan.");
      }
      const s = await ctx.prisma.subscription.findFirst({
        where: { id: String(args.id), userId },
        select: { id: true, status: true },
      });
      if (!s) throw new Error('Abonelik bulunamadı.');
      if (s.status === 'CANCELED') {
        throw new Error('İptal edilmiş abonelik tekrar açılamaz (yeni abonelik kaydet).');
      }
      const updated = await ctx.prisma.subscription.update({
        ...query,
        where: { id: s.id },
        data: { status: args.status },
      });
      await recomputeAndPersistFutureScore(ctx, userId, 'SUBSCRIPTION_CHANGED');
      return updated;
    },
  }),
);

/**
 * Aboneliği iptal eder + yıllık tutarı mikro emeklilik katkısına aktarır.
 * Atomik: status update + MicroContribution insert + Notification.
 */
builder.mutationField('cancelSubscription', (t) =>
  t.prismaField({
    type: 'Subscription',
    authScopes: { authenticated: true },
    description: 'Aboneliği iptal et ve yıllık maliyetini emeklilik katkısına aktar. Atomik.',
    args: {
      id: t.arg.id({ required: true }),
      /// Default: yıllık (amount × 12). Override için.
      contributionAmount: t.arg.float({ required: false }),
    },
    resolve: async (query, _root, args, ctx) => {
      const userId = ctx.userId!;
      const s = await ctx.prisma.subscription.findFirst({
        where: { id: String(args.id), userId },
        select: { id: true, name: true, amount: true, status: true },
      });
      if (!s) throw new Error('Abonelik bulunamadı.');
      if (s.status === 'CANCELED') throw new Error('Bu abonelik zaten iptal edildi.');

      const yearlyAmount = Number(s.amount) * 12;
      const contributionAmount = args.contributionAmount ?? yearlyAmount;

      const updated = await ctx.prisma.$transaction(async (db) => {
        await db.subscription.update({
          where: { id: s.id },
          data: { status: 'CANCELED' },
        });
        await db.microContribution.create({
          data: {
            userId,
            amount: contributionAmount,
            category: 'SUBSCRIPTIONS',
            source: 'CANCELED_SUBSCRIPTION',
            sourceRef: s.id,
            status: 'COMMITTED',
            committedAt: new Date(),
            note: `${s.name} aboneliği iptal edildi`,
          },
        });
        return db.subscription.findUniqueOrThrow({
          where: { id: s.id },
        });
      });

      await ctx.prisma.notification.create({
        data: {
          userId,
          type: 'CONTRIBUTION_ACCEPTED',
          title: 'Abonelik iptal edildi',
          body: `${s.name} iptal edildi · ${Math.round(contributionAmount)} ₺ yıllık tasarruf emekliliğine aktarıldı.`,
          payload: { subscriptionId: s.id, contributionAmount },
        },
      });
      await recomputeAndPersistFutureScore(ctx, userId, 'SUBSCRIPTION_CHANGED');

      return ctx.prisma.subscription.findUniqueOrThrow({
        ...query,
        where: { id: updated.id },
      });
    },
  }),
);

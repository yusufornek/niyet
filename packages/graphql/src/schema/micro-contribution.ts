/**
 * MicroContribution tipi + queries + mutations.
 *
 * Kullanıcının "Katkıya dönüştür" eylemiyle yaratılan kalıcı katkı kayıtları.
 * Demo aşamasında PENDING → COMMITTED akışı otomatik (gerçek emeklilik fonu
 * transferi yok). Production fazında bu transition manuel ya da scheduled job.
 */
import type { SpendingCategory as SpendingCategoryType } from '@prisma/client';

import { builder } from '../builder';
import { recomputeAndPersistFutureScore } from '../score/service';
import { ContributionSourceRef, ContributionStatusRef, SpendingCategoryRef } from './enums';

builder.prismaObject('MicroContribution', {
  fields: (t) => ({
    id: t.exposeID('id'),
    amount: t.field({
      type: 'NonNegativeFloat',
      resolve: (c) => Number(c.amount),
    }),
    category: t.expose('category', { type: SpendingCategoryRef, nullable: true }),
    source: t.expose('source', { type: ContributionSourceRef }),
    status: t.expose('status', { type: ContributionStatusRef }),
    sourceRef: t.exposeString('sourceRef', { nullable: true }),
    note: t.exposeString('note', { nullable: true }),
    createdAt: t.expose('createdAt', { type: 'DateTime' }),
    committedAt: t.expose('committedAt', { type: 'DateTime', nullable: true }),
    reversedAt: t.expose('reversedAt', { type: 'DateTime', nullable: true }),
    goal: t.relation('goal', { nullable: true }),
    rule: t.relation('rule', { nullable: true }),
    transaction: t.relation('transaction', { nullable: true }),
  }),
});

// ─────────────────────────────────────────────────────────────
// Queries
// ─────────────────────────────────────────────────────────────

builder.queryField('microContributions', (t) =>
  t.prismaField({
    type: ['MicroContribution'],
    authScopes: { authenticated: true },
    args: {
      limit: t.arg.int({ defaultValue: 50 }),
      statusFilter: t.arg({ type: ContributionStatusRef, required: false }),
      categoryFilter: t.arg({ type: SpendingCategoryRef, required: false }),
    },
    resolve: async (query, _root, args, ctx) => {
      return ctx.prisma.microContribution.findMany({
        ...query,
        where: {
          userId: ctx.userId!,
          ...(args.statusFilter ? { status: args.statusFilter } : {}),
          ...(args.categoryFilter ? { category: args.categoryFilter } : {}),
        },
        orderBy: { createdAt: 'desc' },
        take: args.limit ?? 50,
      });
    },
  }),
);

const ContributionSummary = builder.simpleObject('ContributionSummary', {
  description: 'Mikro katkı özeti — dashboard ve geçmiş kartlarında kullanılır',
  fields: (t) => ({
    /// Tüm zamanların toplamı (COMMITTED + PENDING)
    totalAccepted: t.float(),
    /// Yalnızca COMMITTED toplam
    totalCommitted: t.float(),
    /// PENDING (sıradaki ödeme bekleyen)
    totalPending: t.float(),
    /// Kabul edilen katkı sayısı
    count: t.int(),
    /// Son 30 günde kabul edilen tutar
    last30dAmount: t.float(),
    /// Son 30 gün count
    last30dCount: t.int(),
  }),
});

builder.queryField('contributionSummary', (t) =>
  t.field({
    type: ContributionSummary,
    authScopes: { authenticated: true },
    description: 'Mikro katkı toplamları (dashboard widget için)',
    resolve: async (_root, _args, ctx) => {
      const userId = ctx.userId!;
      const since30 = new Date();
      since30.setDate(since30.getDate() - 30);

      const [all, last30] = await Promise.all([
        ctx.prisma.microContribution.findMany({
          where: { userId, status: { not: 'REVERSED' } },
          select: { amount: true, status: true },
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

      const totalAccepted = all.reduce((s, c) => s + Number(c.amount), 0);
      const totalCommitted = all
        .filter((c) => c.status === 'COMMITTED')
        .reduce((s, c) => s + Number(c.amount), 0);
      const totalPending = all
        .filter((c) => c.status === 'PENDING')
        .reduce((s, c) => s + Number(c.amount), 0);
      const last30dAmount = last30.reduce((s, c) => s + Number(c.amount), 0);

      return {
        totalAccepted: Math.round(totalAccepted),
        totalCommitted: Math.round(totalCommitted),
        totalPending: Math.round(totalPending),
        count: all.length,
        last30dAmount: Math.round(last30dAmount),
        last30dCount: last30.length,
      };
    },
  }),
);

// ─────────────────────────────────────────────────────────────
// Mutations
// ─────────────────────────────────────────────────────────────

/**
 * Tek bir transaction'ı katkıya dönüştürür.
 * `Transaction.acceptedContributionId` unique olduğu için aynı tx iki kez katkıya dönmez.
 */
builder.mutationField('acceptTransactionContribution', (t) =>
  t.prismaField({
    type: 'MicroContribution',
    authScopes: { authenticated: true },
    description:
      "Bir reducible transaction'ı mikro emeklilik katkısına dönüştür. Aynı tx tekrar dönüştürülemez (unique constraint).",
    args: {
      transactionId: t.arg.id({ required: true }),
      /// Override edebilir — default opportunity field'ından okunur
      amount: t.arg.float({ required: false }),
      goalId: t.arg.id({ required: false }),
      note: t.arg.string({ required: false }),
    },
    resolve: async (query, _root, args, ctx) => {
      const userId = ctx.userId!;
      const tx = await ctx.prisma.transaction.findFirst({
        where: { id: String(args.transactionId), userId },
        select: {
          id: true,
          category: true,
          opportunity: true,
          isReducible: true,
          acceptedContributionId: true,
        },
      });
      if (!tx) throw new Error('Transaction bulunamadı.');
      if (tx.acceptedContributionId) {
        throw new Error('Bu işlem zaten katkıya dönüştürülmüş.');
      }
      if (!tx.isReducible || (tx.opportunity == null && args.amount == null)) {
        throw new Error('Bu işlem azaltılabilir olarak işaretli değil.');
      }
      const amount = args.amount ?? Number(tx.opportunity);
      if (amount <= 0) throw new Error('Katkı tutarı pozitif olmalı.');

      // Atomik: contribution yarat + transaction'a bağla
      const contribution = await ctx.prisma.$transaction(async (db) => {
        const c = await db.microContribution.create({
          data: {
            userId,
            amount,
            category: tx.category,
            source: 'REDUCIBLE_TRANSACTION',
            sourceRef: tx.id,
            status: 'COMMITTED', // Demo aşamasında otomatik commit
            committedAt: new Date(),
            goalId: args.goalId ? String(args.goalId) : null,
            note: args.note ?? null,
          },
        });
        await db.transaction.update({
          where: { id: tx.id },
          data: { acceptedContributionId: c.id },
        });
        return c;
      });

      // Notification ekle (Realtime broadcast)
      await ctx.prisma.notification.create({
        data: {
          userId,
          type: 'CONTRIBUTION_ACCEPTED',
          title: 'Katkı eklendi',
          body: `${Math.round(amount)} ₺ mikro emeklilik katkısı kaydedildi.`,
          payload: { contributionId: contribution.id, source: 'REDUCIBLE_TRANSACTION' },
        },
      });
      await recomputeAndPersistFutureScore(ctx, userId, 'CONTRIBUTION_CHANGED');

      return ctx.prisma.microContribution.findUniqueOrThrow({
        ...query,
        where: { id: contribution.id },
      });
    },
  }),
);

/**
 * Bir kategorideki tüm reducible TX'leri toplu katkıya dönüştür.
 * Henüz katkıya dönüşmemiş olanlar tek tek işlenir.
 */
builder.mutationField('acceptCategoryContribution', (t) =>
  t.prismaField({
    type: 'MicroContribution',
    authScopes: { authenticated: true },
    description:
      'Bir kategorideki tüm reducible işlemleri tek seferde katkıya dönüştür. Toplam opportunity tutarı kullanılır.',
    args: {
      category: t.arg({ type: SpendingCategoryRef, required: true }),
      goalId: t.arg.id({ required: false }),
    },
    resolve: async (query, _root, args, ctx) => {
      const userId = ctx.userId!;
      const since30 = new Date();
      since30.setDate(since30.getDate() - 30);

      const reducibleTxs = await ctx.prisma.transaction.findMany({
        where: {
          userId,
          category: args.category as SpendingCategoryType,
          isReducible: true,
          opportunity: { not: null },
          acceptedContributionId: null,
          occurredAt: { gte: since30 },
        },
        select: { id: true, opportunity: true },
      });

      if (reducibleTxs.length === 0) {
        throw new Error('Bu kategoride dönüştürülecek işlem kalmadı.');
      }

      const total = reducibleTxs.reduce(
        (s, t) => s + (t.opportunity != null ? Number(t.opportunity) : 0),
        0,
      );

      const contribution = await ctx.prisma.$transaction(async (db) => {
        const c = await db.microContribution.create({
          data: {
            userId,
            amount: total,
            category: args.category as SpendingCategoryType,
            source: 'CATEGORY_BUCKET',
            sourceRef: args.category,
            status: 'COMMITTED',
            committedAt: new Date(),
            goalId: args.goalId ? String(args.goalId) : null,
          },
        });
        // İlk TX bu contribution'a bağlanır (tracking için)
        if (reducibleTxs[0]) {
          await db.transaction.update({
            where: { id: reducibleTxs[0].id },
            data: { acceptedContributionId: c.id },
          });
        }
        return c;
      });

      await ctx.prisma.notification.create({
        data: {
          userId,
          type: 'CONTRIBUTION_ACCEPTED',
          title: 'Toplu katkı eklendi',
          body: `${args.category} kategorisinden ${Math.round(total)} ₺ mikro emeklilik katkısına aktarıldı.`,
          payload: {
            contributionId: contribution.id,
            source: 'CATEGORY_BUCKET',
            txCount: reducibleTxs.length,
          },
        },
      });
      await recomputeAndPersistFutureScore(ctx, userId, 'CONTRIBUTION_CHANGED');

      return ctx.prisma.microContribution.findUniqueOrThrow({
        ...query,
        where: { id: contribution.id },
      });
    },
  }),
);

/**
 * Bir katkıyı geri al (REVERSED). İlişkili transaction'ın acceptedContributionId temizlenir.
 */
builder.mutationField('reverseContribution', (t) =>
  t.prismaField({
    type: 'MicroContribution',
    authScopes: { authenticated: true },
    args: { id: t.arg.id({ required: true }) },
    resolve: async (query, _root, args, ctx) => {
      const userId = ctx.userId!;
      const c = await ctx.prisma.microContribution.findFirst({
        where: { id: String(args.id), userId },
        select: { id: true, status: true },
      });
      if (!c) throw new Error('Katkı bulunamadı.');
      if (c.status === 'REVERSED') throw new Error('Bu katkı zaten geri alınmış.');

      await ctx.prisma.$transaction(async (db) => {
        await db.transaction.updateMany({
          where: { acceptedContributionId: c.id, userId },
          data: { acceptedContributionId: null },
        });
        await db.microContribution.update({
          where: { id: c.id },
          data: { status: 'REVERSED', reversedAt: new Date() },
        });
      });
      await recomputeAndPersistFutureScore(ctx, userId, 'CONTRIBUTION_CHANGED');

      return ctx.prisma.microContribution.findUniqueOrThrow({
        ...query,
        where: { id: c.id },
      });
    },
  }),
);

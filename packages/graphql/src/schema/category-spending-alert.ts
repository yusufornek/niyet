/**
 * CategorySpendingAlert GraphQL tipi + queries + mutations.
 *
 * Kullanici "azaltmak istedigim kategorilerde aylik limit + esik uyari"
 * tercihini yonetir.
 */
import { z } from 'zod';

import { builder } from '../builder';
import { CategorySpendingAlertService } from '../category-spending-alert/service';
import { SpendingCategoryRef } from './enums';

// ─────────────────────────────────────────────────────────────
// Tipler
// ─────────────────────────────────────────────────────────────

builder.prismaObject('CategorySpendingAlert', {
  fields: (t) => ({
    id: t.exposeID('id'),
    category: t.expose('category', { type: SpendingCategoryRef }),
    monthlyLimit: t.field({
      type: 'NonNegativeFloat',
      resolve: (a) => Number(a.monthlyLimit),
    }),
    warnThresholdPct: t.field({
      type: 'NonNegativeFloat',
      resolve: (a) => Number(a.warnThresholdPct),
    }),
    active: t.exposeBoolean('active'),
    lastAlertedMonth: t.exposeString('lastAlertedMonth', { nullable: true }),
    lastAlertedLevel: t.exposeString('lastAlertedLevel', { nullable: true }),
    createdAt: t.expose('createdAt', { type: 'DateTime' }),
    updatedAt: t.expose('updatedAt', { type: 'DateTime' }),
  }),
});

const AlertLevelRef = builder.enumType('CategorySpendingAlertLevel', {
  values: ['BELOW', 'WARNING', 'OVER'] as const,
});

const EvaluationRef = builder.simpleObject('CategorySpendingEvaluation', {
  description: 'Belirli bir kategori + ay icin limit kullanim hesabi.',
  fields: (t) => ({
    category: t.field({ type: SpendingCategoryRef }),
    monthYear: t.string(),
    monthlyLimit: t.float(),
    spentAmount: t.float(),
    remainingAmount: t.float(),
    utilizationPct: t.float(),
    warnThresholdPct: t.float(),
    level: t.field({ type: AlertLevelRef }),
  }),
});

const OutcomeRef = builder.simpleObject('CategorySpendingAlertOutcome', {
  description: 'Bir alert degerlendirme sonucu (notification uretildi mi?).',
  fields: (t) => ({
    alertId: t.id(),
    category: t.field({ type: SpendingCategoryRef }),
    evaluation: t.field({ type: EvaluationRef }),
    notificationCreated: t.boolean(),
    notificationId: t.id({ nullable: true }),
    skippedReason: t.string({ nullable: true }),
  }),
});

// ─────────────────────────────────────────────────────────────
// Queries
// ─────────────────────────────────────────────────────────────

builder.queryField('categorySpendingAlerts', (t) =>
  t.prismaField({
    type: ['CategorySpendingAlert'],
    authScopes: { authenticated: true },
    description: 'Kullanicinin kategori-bazli aylik harcama limit uyarilari.',
    resolve: async (query, _root, _args, ctx) =>
      ctx.prisma.categorySpendingAlert.findMany({
        ...query,
        where: { userId: ctx.userId! },
        orderBy: { createdAt: 'asc' },
      }),
  }),
);

builder.queryField('previewCategorySpendingAlert', (t) =>
  t.field({
    type: EvaluationRef,
    authScopes: { authenticated: true },
    description:
      'Bir kategori icin "su anki ay icin nasil duruyorum" preview\'i. Notification uretmez.',
    args: {
      category: t.arg({ type: SpendingCategoryRef, required: true }),
      monthlyLimit: t.arg.float({ required: true }),
      warnThresholdPct: t.arg.float({ required: false }),
      monthYear: t.arg.string({ required: false }),
    },
    resolve: async (_root, args, ctx) => {
      const service = new CategorySpendingAlertService({
        prisma: ctx.prisma,
        now: ctx.now,
      });
      return service.previewAlert(
        ctx.userId!,
        {
          category: args.category,
          monthlyLimit: args.monthlyLimit,
          warnThresholdPct: args.warnThresholdPct ?? undefined,
        },
        args.monthYear ?? undefined,
      );
    },
  }),
);

// ─────────────────────────────────────────────────────────────
// Mutations
// ─────────────────────────────────────────────────────────────

const CreateAlertInput = z.object({
  monthlyLimit: z.number().positive().finite(),
  warnThresholdPct: z.number().gt(0).lte(1).optional(),
});

builder.mutationField('createCategorySpendingAlert', (t) =>
  t.prismaField({
    type: 'CategorySpendingAlert',
    authScopes: { authenticated: true },
    description: 'Bir kategori icin aylik limit + esik uyarisi olustur.',
    args: {
      category: t.arg({ type: SpendingCategoryRef, required: true }),
      monthlyLimit: t.arg.float({ required: true }),
      warnThresholdPct: t.arg.float({ required: false, defaultValue: 0.8 }),
    },
    resolve: async (query, _root, args, ctx) => {
      const userId = ctx.userId!;
      CreateAlertInput.parse({
        monthlyLimit: args.monthlyLimit,
        warnThresholdPct: args.warnThresholdPct ?? 0.8,
      });
      const service = new CategorySpendingAlertService({
        prisma: ctx.prisma,
        now: ctx.now,
      });
      try {
        await service.createAlert(userId, {
          category: args.category,
          monthlyLimit: args.monthlyLimit,
          warnThresholdPct: args.warnThresholdPct ?? 0.8,
        });
      } catch (e) {
        if (e instanceof Error && e.message.includes('Unique constraint')) {
          throw new Error('Bu kategori icin zaten bir limit tanimli.');
        }
        throw e;
      }
      return ctx.prisma.categorySpendingAlert.findFirstOrThrow({
        ...query,
        where: { userId, category: args.category },
      });
    },
  }),
);

builder.mutationField('updateCategorySpendingAlert', (t) =>
  t.prismaField({
    type: 'CategorySpendingAlert',
    authScopes: { authenticated: true },
    description: 'Limit / esik / aktiflik guncelle.',
    args: {
      id: t.arg.id({ required: true }),
      monthlyLimit: t.arg.float({ required: false }),
      warnThresholdPct: t.arg.float({ required: false }),
      active: t.arg.boolean({ required: false }),
    },
    resolve: async (query, _root, args, ctx) => {
      const userId = ctx.userId!;
      const service = new CategorySpendingAlertService({
        prisma: ctx.prisma,
        now: ctx.now,
      });
      await service.updateLimit(userId, String(args.id), {
        monthlyLimit: args.monthlyLimit ?? undefined,
        warnThresholdPct: args.warnThresholdPct ?? undefined,
        active: args.active ?? undefined,
      });
      return ctx.prisma.categorySpendingAlert.findUniqueOrThrow({
        ...query,
        where: { id: String(args.id) },
      });
    },
  }),
);

builder.mutationField('deleteCategorySpendingAlert', (t) =>
  t.boolean({
    authScopes: { authenticated: true },
    description: 'Bir limit / esik uyari kuralini sil.',
    args: { id: t.arg.id({ required: true }) },
    resolve: async (_root, args, ctx) => {
      const service = new CategorySpendingAlertService({
        prisma: ctx.prisma,
        now: ctx.now,
      });
      await service.deleteAlert(ctx.userId!, String(args.id));
      return true;
    },
  }),
);

builder.mutationField('evaluateMyCategorySpendingAlerts', (t) =>
  t.field({
    type: [OutcomeRef],
    authScopes: { authenticated: true },
    description:
      'Kullanicinin tum aktif limit uyarilarini bu ay icin degerlendir; esik gecisi varsa notification uret. Idempotent.',
    args: { monthYear: t.arg.string({ required: false }) },
    resolve: async (_root, args, ctx) => {
      const service = new CategorySpendingAlertService({
        prisma: ctx.prisma,
        now: ctx.now,
      });
      return service.evaluateForUser(ctx.userId!, args.monthYear ?? undefined);
    },
  }),
);

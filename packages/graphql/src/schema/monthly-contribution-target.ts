/**
 * MonthlyContributionTarget GraphQL tipi + queries + mutations.
 *
 * Kullanici "aylik katki hedefi" yonetir; servis esik gecisi varsa notification
 * uretir (Idempotent).
 */
import { z } from 'zod';

import { builder } from '../builder';
import { MonthlyContributionTargetService } from '../monthly-contribution-target/service';

// ─────────────────────────────────────────────────────────────
// Tipler
// ─────────────────────────────────────────────────────────────

builder.prismaObject('MonthlyContributionTarget', {
  fields: (t) => ({
    id: t.exposeID('id'),
    targetAmount: t.field({
      type: 'NonNegativeFloat',
      resolve: (r) => Number(r.targetAmount),
    }),
    warnThresholdPct: t.field({
      type: 'NonNegativeFloat',
      resolve: (r) => Number(r.warnThresholdPct),
    }),
    active: t.exposeBoolean('active'),
    lastAlertedMonth: t.exposeString('lastAlertedMonth', { nullable: true }),
    lastAlertedLevel: t.exposeString('lastAlertedLevel', { nullable: true }),
    createdAt: t.expose('createdAt', { type: 'DateTime' }),
    updatedAt: t.expose('updatedAt', { type: 'DateTime' }),
  }),
});

const TargetLevelRef = builder.enumType('MonthlyTargetLevel', {
  values: ['BEHIND', 'NEAR', 'REACHED'] as const,
});

const EvaluationRef = builder.simpleObject('MonthlyContributionEvaluation', {
  description: 'Aylik katki hedefi degerlendirmesi.',
  fields: (t) => ({
    monthYear: t.string(),
    targetAmount: t.float(),
    contributedAmount: t.float(),
    remainingAmount: t.float(),
    utilizationPct: t.float(),
    warnThresholdPct: t.float(),
    level: t.field({ type: TargetLevelRef }),
  }),
});

const OutcomeRef = builder.simpleObject('MonthlyContributionTargetOutcome', {
  description: 'Degerlendirme sonucu — notification uretildi mi?',
  fields: (t) => ({
    targetId: t.id({ nullable: true }),
    evaluation: t.field({ type: EvaluationRef, nullable: true }),
    notificationCreated: t.boolean(),
    notificationId: t.id({ nullable: true }),
    skippedReason: t.string({ nullable: true }),
  }),
});

// ─────────────────────────────────────────────────────────────
// Queries
// ─────────────────────────────────────────────────────────────

builder.queryField('myMonthlyContributionTarget', (t) =>
  t.prismaField({
    type: 'MonthlyContributionTarget',
    nullable: true,
    authScopes: { authenticated: true },
    description: 'Kullanicinin aylik katki hedefi (1:1). Yoksa null.',
    resolve: async (query, _root, _args, ctx) =>
      ctx.prisma.monthlyContributionTarget.findUnique({
        ...query,
        where: { userId: ctx.userId! },
      }),
  }),
);

builder.queryField('previewMyMonthlyContributionTarget', (t) =>
  t.field({
    type: EvaluationRef,
    authScopes: { authenticated: true },
    description: "Hedef preview'i — DB'ye yazmaz. UI canli bar icin.",
    args: {
      targetAmount: t.arg.float({ required: true }),
      warnThresholdPct: t.arg.float({ required: false }),
      monthYear: t.arg.string({ required: false }),
    },
    resolve: async (_root, args, ctx) => {
      const service = new MonthlyContributionTargetService({
        prisma: ctx.prisma,
        now: ctx.now,
      });
      return service.previewForUser(
        ctx.userId!,
        {
          targetAmount: args.targetAmount,
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

const UpsertInput = z.object({
  targetAmount: z.number().positive().finite(),
  warnThresholdPct: z.number().gt(0).lte(1).optional(),
  active: z.boolean().optional(),
});

builder.mutationField('upsertMyMonthlyContributionTarget', (t) =>
  t.prismaField({
    type: 'MonthlyContributionTarget',
    authScopes: { authenticated: true },
    description: 'Aylik katki hedefi olustur veya guncelle.',
    args: {
      targetAmount: t.arg.float({ required: true }),
      warnThresholdPct: t.arg.float({ required: false, defaultValue: 0.9 }),
      active: t.arg.boolean({ required: false }),
    },
    resolve: async (query, _root, args, ctx) => {
      UpsertInput.parse({
        targetAmount: args.targetAmount,
        warnThresholdPct: args.warnThresholdPct ?? 0.9,
        active: args.active ?? undefined,
      });
      const service = new MonthlyContributionTargetService({
        prisma: ctx.prisma,
        now: ctx.now,
      });
      await service.upsertTarget(ctx.userId!, {
        targetAmount: args.targetAmount,
        warnThresholdPct: args.warnThresholdPct ?? 0.9,
        active: args.active ?? undefined,
      });
      return ctx.prisma.monthlyContributionTarget.findUniqueOrThrow({
        ...query,
        where: { userId: ctx.userId! },
      });
    },
  }),
);

builder.mutationField('deleteMyMonthlyContributionTarget', (t) =>
  t.boolean({
    authScopes: { authenticated: true },
    description: 'Aylik katki hedefini sil.',
    resolve: async (_root, _args, ctx) => {
      const service = new MonthlyContributionTargetService({
        prisma: ctx.prisma,
        now: ctx.now,
      });
      return service.deleteTarget(ctx.userId!);
    },
  }),
);

builder.mutationField('evaluateMyMonthlyContributionTarget', (t) =>
  t.field({
    type: OutcomeRef,
    authScopes: { authenticated: true },
    description:
      'Aylik hedefi bu ay icin degerlendir; esik gecisi varsa notification uret. Idempotent.',
    args: { monthYear: t.arg.string({ required: false }) },
    resolve: async (_root, args, ctx) => {
      const service = new MonthlyContributionTargetService({
        prisma: ctx.prisma,
        now: ctx.now,
      });
      const outcome = await service.evaluateForUser(ctx.userId!, args.monthYear ?? undefined);
      // "NO_TARGET" durumu — bos outcome dondur
      if (!('targetId' in outcome)) {
        return {
          targetId: null,
          evaluation: null,
          notificationCreated: false,
          notificationId: null,
          skippedReason: outcome.skippedReason,
        };
      }
      return outcome;
    },
  }),
);

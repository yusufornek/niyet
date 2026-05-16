/**
 * CategoryAutoSaveRule GraphQL tipi + queries + mutations.
 *
 * Kullanici "kahve, yemek siparisi gibi kategorilerde ortalama-altinda
 * harcadigimda farki otomatik kaydet" tercihini yonetir.
 *
 * Akis:
 * - `categoryAutoSaveRules` query: kullanicinin aktif/pasif kurallari.
 * - `createCategoryAutoSaveRule` / `deleteCategoryAutoSaveRule`: CRUD.
 * - `previewCategoryAutoSave`: bir kategori icin "su anda tetiklensem ne olur"
 *   (MicroContribution yaratmaz).
 * - `triggerCategoryAutoSaveRule`: belirli bir kural icin bu ay'in hesabini
 *   yap, gerekirse MicroContribution yarat (UI "Simdi hesapla" butonu).
 * - `runCategoryAutoSaveForMe`: kullanicinin tum aktif kurallarini calistir
 *   (Radar sayfasi acilirken arka planda da cagrilabilir).
 */
import { z } from 'zod';

import { builder } from '../builder';
import {
  CategoryAutoSaveService,
  type CategoryAutoSaveOutcome,
} from '../category-auto-save/service';
import { recomputeAndPersistFutureScore } from '../score/service';
import { SpendingCategoryRef } from './enums';

// ─────────────────────────────────────────────────────────────
// Tipler
// ─────────────────────────────────────────────────────────────

builder.prismaObject('CategoryAutoSaveRule', {
  fields: (t) => ({
    id: t.exposeID('id'),
    category: t.expose('category', { type: SpendingCategoryRef }),
    lookbackMonths: t.exposeInt('lookbackMonths'),
    active: t.exposeBoolean('active'),
    createdAt: t.expose('createdAt', { type: 'DateTime' }),
    updatedAt: t.expose('updatedAt', { type: 'DateTime' }),
    lastTriggeredAt: t.expose('lastTriggeredAt', { type: 'DateTime', nullable: true }),
    lastTriggeredMonth: t.exposeString('lastTriggeredMonth', { nullable: true }),
    lastTransferAmount: t.field({
      type: 'NonNegativeFloat',
      nullable: true,
      resolve: (r) => (r.lastTransferAmount == null ? null : Number(r.lastTransferAmount)),
    }),
  }),
});

const ShortfallLookbackMonth = builder.simpleObject('CategoryAutoSaveLookbackMonth', {
  description: 'Lookback ayinin ozet harcama bilgisi (transparency icin).',
  fields: (t) => ({
    monthYear: t.string({ description: 'YYYY-MM' }),
    amount: t.float(),
    txCount: t.int(),
  }),
});

const ShortfallResultRef = builder.simpleObject('CategoryAutoSaveShortfall', {
  description: 'Bir kategori + ay icin ortalama-alti fark hesabi sonucu.',
  fields: (t) => ({
    monthYear: t.string(),
    currentAmount: t.float(),
    averageAmount: t.float({ nullable: true }),
    lookback: t.field({ type: [ShortfallLookbackMonth] }),
    lookbackMonthsAnalyzed: t.int(),
    hasSufficientHistory: t.boolean(),
    shortfallAmount: t.float(),
    shortfallPct: t.float({ nullable: true }),
    shouldTrigger: t.boolean(),
  }),
});

const AutoSaveOutcomeStatus = builder.enumType('CategoryAutoSaveOutcomeStatus', {
  values: [
    'TRIGGERED',
    'SKIPPED_ALREADY_TRIGGERED',
    'SKIPPED_INSUFFICIENT_HISTORY',
    'SKIPPED_NO_SHORTFALL',
  ] as const,
});

const AutoSaveOutcomeRef = builder.simpleObject('CategoryAutoSaveOutcome', {
  description:
    'Bir tetikleme denemesinin sonucu (gercek MicroContribution yaratmis olabilir veya olmayabilir).',
  fields: (t) => ({
    ruleId: t.id(),
    monthYear: t.string(),
    category: t.field({ type: SpendingCategoryRef }),
    status: t.field({ type: AutoSaveOutcomeStatus }),
    shortfall: t.field({ type: ShortfallResultRef }),
    microContributionId: t.id({ nullable: true }),
  }),
});

// ─────────────────────────────────────────────────────────────
// Queries
// ─────────────────────────────────────────────────────────────

builder.queryField('categoryAutoSaveRules', (t) =>
  t.prismaField({
    type: ['CategoryAutoSaveRule'],
    authScopes: { authenticated: true },
    description: 'Kullanicinin otomatik fark aktarim kurallari.',
    resolve: async (query, _root, _args, ctx) => {
      return ctx.prisma.categoryAutoSaveRule.findMany({
        ...query,
        where: { userId: ctx.userId! },
        orderBy: { createdAt: 'asc' },
      });
    },
  }),
);

builder.queryField('previewCategoryAutoSave', (t) =>
  t.field({
    type: ShortfallResultRef,
    authScopes: { authenticated: true },
    description:
      'Bir kategori icin "bu ay tetiklensem ne kadar fark aktarilirdi" preview\'i. MicroContribution yaratmaz.',
    args: {
      category: t.arg({ type: SpendingCategoryRef, required: true }),
      lookbackMonths: t.arg.int({ required: false, defaultValue: 3 }),
      monthYear: t.arg.string({ required: false, description: 'YYYY-MM; bos ise bu ay.' }),
    },
    resolve: async (_root, args, ctx) => {
      const userId = ctx.userId!;
      const service = new CategoryAutoSaveService({ prisma: ctx.prisma, now: ctx.now });
      // Sahte rule objesi ile preview cagir (DB yazmadan)
      const pseudoRule = {
        id: 'preview',
        userId,
        category: args.category,
        lookbackMonths: args.lookbackMonths ?? 3,
        active: true,
        createdAt: ctx.now(),
        updatedAt: ctx.now(),
        lastTriggeredAt: null,
        lastTriggeredMonth: null,
        lastTransferAmount: null,
      } as Parameters<CategoryAutoSaveService['previewRule']>[0];
      return service.previewRule(pseudoRule, args.monthYear ?? undefined);
    },
  }),
);

// ─────────────────────────────────────────────────────────────
// Mutations
// ─────────────────────────────────────────────────────────────

const CreateInput = z.object({
  category: z.string().min(1),
  lookbackMonths: z.number().int().min(1).max(12).optional(),
});

builder.mutationField('createCategoryAutoSaveRule', (t) =>
  t.prismaField({
    type: 'CategoryAutoSaveRule',
    authScopes: { authenticated: true },
    description: 'Bir kategori icin otomatik fark aktarimi kurali olustur.',
    args: {
      category: t.arg({ type: SpendingCategoryRef, required: true }),
      lookbackMonths: t.arg.int({ required: false, defaultValue: 3 }),
    },
    resolve: async (query, _root, args, ctx) => {
      CreateInput.parse({
        category: args.category,
        lookbackMonths: args.lookbackMonths ?? 3,
      });
      const userId = ctx.userId!;
      const service = new CategoryAutoSaveService({ prisma: ctx.prisma, now: ctx.now });
      try {
        await service.createRule(userId, {
          category: args.category,
          lookbackMonths: args.lookbackMonths ?? 3,
        });
      } catch (e) {
        // Unique constraint — bu kategori icin zaten kural var
        if (e instanceof Error && e.message.includes('Unique constraint')) {
          throw new Error('Bu kategori icin zaten bir kural tanimli.');
        }
        throw e;
      }
      return ctx.prisma.categoryAutoSaveRule.findFirstOrThrow({
        ...query,
        where: { userId, category: args.category },
      });
    },
  }),
);

builder.mutationField('deleteCategoryAutoSaveRule', (t) =>
  t.boolean({
    authScopes: { authenticated: true },
    description: 'Bir otomatik fark aktarim kuralini sil. Basariliysa true doner.',
    args: { id: t.arg.id({ required: true }) },
    resolve: async (_root, args, ctx) => {
      const userId = ctx.userId!;
      const service = new CategoryAutoSaveService({ prisma: ctx.prisma, now: ctx.now });
      await service.deleteRule(userId, String(args.id));
      return true;
    },
  }),
);

builder.mutationField('setCategoryAutoSaveRuleActive', (t) =>
  t.prismaField({
    type: 'CategoryAutoSaveRule',
    authScopes: { authenticated: true },
    description: 'Bir kurali aktif/pasif yap.',
    args: {
      id: t.arg.id({ required: true }),
      active: t.arg.boolean({ required: true }),
    },
    resolve: async (query, _root, args, ctx) => {
      const userId = ctx.userId!;
      const service = new CategoryAutoSaveService({ prisma: ctx.prisma, now: ctx.now });
      await service.setActive(userId, String(args.id), args.active);
      return ctx.prisma.categoryAutoSaveRule.findUniqueOrThrow({
        ...query,
        where: { id: String(args.id) },
      });
    },
  }),
);

builder.mutationField('triggerCategoryAutoSaveRule', (t) =>
  t.field({
    type: AutoSaveOutcomeRef,
    authScopes: { authenticated: true },
    description:
      "Bir kural icin bu ay'in hesabini yap; fark > 0 ise MicroContribution yarat. Idempotent.",
    args: {
      id: t.arg.id({ required: true }),
      monthYear: t.arg.string({ required: false }),
    },
    resolve: async (_root, args, ctx) => {
      const userId = ctx.userId!;
      const rule = await ctx.prisma.categoryAutoSaveRule.findFirst({
        where: { id: String(args.id), userId },
      });
      if (!rule) throw new Error('Kural bulunamadi veya erisim reddedildi.');
      const service = new CategoryAutoSaveService({ prisma: ctx.prisma, now: ctx.now });
      const outcome = await service.runRule(rule, args.monthYear ?? undefined);
      if (outcome.status === 'TRIGGERED') {
        await recomputeAndPersistFutureScore(ctx, userId, 'CONTRIBUTION_CHANGED');
      }
      return shapeOutcome(outcome);
    },
  }),
);

builder.mutationField('runCategoryAutoSaveForMe', (t) =>
  t.field({
    type: [AutoSaveOutcomeRef],
    authScopes: { authenticated: true },
    description:
      'Kullanicinin tum aktif otomatik fark kurallarini bu ay icin calistir. Idempotent.',
    args: { monthYear: t.arg.string({ required: false }) },
    resolve: async (_root, args, ctx) => {
      const userId = ctx.userId!;
      const service = new CategoryAutoSaveService({ prisma: ctx.prisma, now: ctx.now });
      const outcomes = await service.runForUser(userId, args.monthYear ?? undefined);
      const triggeredAny = outcomes.some((o) => o.status === 'TRIGGERED');
      if (triggeredAny) {
        await recomputeAndPersistFutureScore(ctx, userId, 'CONTRIBUTION_CHANGED');
      }
      return outcomes.map(shapeOutcome);
    },
  }),
);

function shapeOutcome(o: CategoryAutoSaveOutcome) {
  return {
    ruleId: o.ruleId,
    monthYear: o.monthYear,
    category: o.category,
    status: o.status,
    shortfall: o.shortfall,
    microContributionId: o.microContributionId ?? null,
  };
}

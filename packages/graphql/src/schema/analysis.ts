/**
 * AnalysisRun + TransactionAnalysis tipleri + runAnalysis mutation.
 *
 * runAnalysis: Spending Analyzer Agent'i tetikler — son 90 gün tx'leri Gemini'ye
 * yollar, function call sonuçlarını DB'ye yazar. Cache: 1 saat.
 */
import { persistAnalysisResult, runSpendingAnalysis } from '@niyet/ai';

import { builder } from '../builder';
import { SpendingCategoryRef } from './enums';

builder.prismaObject('AnalysisRun', {
  fields: (t) => ({
    id: t.exposeID('id'),
    triggeredAt: t.expose('triggeredAt', { type: 'DateTime' }),
    geminiModel: t.exposeString('geminiModel'),
    durationMs: t.exposeInt('durationMs'),
    totalTransactions: t.exposeInt('totalTransactions'),
    totalOpportunity: t.field({
      type: 'NonNegativeFloat',
      resolve: (a) => Number(a.totalOpportunity),
    }),
    totalTokens: t.exposeInt('totalTokens', { nullable: true }),
    error: t.exposeString('error', { nullable: true }),
    request: t.expose('request', { type: 'JSON' }),
    response: t.expose('response', { type: 'JSON' }),
    transactionAnalyses: t.relation('transactionAnalyses'),
  }),
});

builder.prismaObject('TransactionAnalysis', {
  fields: (t) => ({
    id: t.exposeID('id'),
    suggestedCategory: t.expose('suggestedCategory', {
      type: SpendingCategoryRef,
      nullable: true,
    }),
    markedSubscription: t.exposeBoolean('markedSubscription'),
    reducibleAmount: t.field({
      type: 'NonNegativeFloat',
      nullable: true,
      resolve: (a) => (a.reducibleAmount != null ? Number(a.reducibleAmount) : null),
    }),
    reasoning: t.exposeString('reasoning', { nullable: true }),
    transaction: t.relation('transaction'),
  }),
});

builder.queryField('analysisHistory', (t) =>
  t.prismaField({
    type: ['AnalysisRun'],
    authScopes: { authenticated: true },
    args: { limit: t.arg.int({ defaultValue: 10 }) },
    resolve: async (query, _root, args, ctx) => {
      return ctx.prisma.analysisRun.findMany({
        ...query,
        where: { userId: ctx.userId! },
        orderBy: { triggeredAt: 'desc' },
        take: args.limit ?? 10,
      });
    },
  }),
);

builder.queryField('analysisRun', (t) =>
  t.prismaField({
    type: 'AnalysisRun',
    nullable: true,
    authScopes: { authenticated: true },
    description: "Tek bir analiz run'ı (TransactionAnalysis detaylarıyla)",
    args: { id: t.arg.id({ required: true }) },
    resolve: async (query, _root, args, ctx) => {
      return ctx.prisma.analysisRun.findFirst({
        ...query,
        where: { id: String(args.id), userId: ctx.userId! },
      });
    },
  }),
);

// Cache penceresi: aynı user 1 saat içinde tekrar tetiklerse son run dönülür
const CACHE_WINDOW_MS = 60 * 60 * 1000;

builder.mutationField('runAnalysis', (t) =>
  t.prismaField({
    type: 'AnalysisRun',
    authScopes: { authenticated: true },
    description:
      'Spending Analyzer Agent (Pattern A) — Gemini Function Calling ile son 90 gün analizi. Cache: 1 saat.',
    args: {
      forceRefresh: t.arg.boolean({ defaultValue: false }),
    },
    resolve: async (query, _root, args, ctx) => {
      const userId = ctx.userId!;

      // 1. Cache kontrolü
      if (!args.forceRefresh) {
        const since = new Date(Date.now() - CACHE_WINDOW_MS);
        const cached = await ctx.prisma.analysisRun.findFirst({
          ...query,
          where: { userId, triggeredAt: { gte: since }, error: null },
          orderBy: { triggeredAt: 'desc' },
        });
        if (cached) return cached;
      }

      // 2. Son 90 gün tx'leri
      const since90 = new Date();
      since90.setDate(since90.getDate() - 90);
      const transactions = await ctx.prisma.transaction.findMany({
        where: { userId, occurredAt: { gte: since90 } },
        select: {
          id: true,
          amount: true,
          merchant: true,
          occurredAt: true,
          category: true,
          description: true,
        },
        orderBy: { occurredAt: 'desc' },
        take: 300,
      });

      // 3. Agent pipeline
      const result = await runSpendingAnalysis({ userId, transactions });

      // 4. DB persist
      const run = await persistAnalysisResult(userId, result);

      // 5. Notification ekle (Realtime için Faz 6'da channel'a broadcast eklenecek)
      await ctx.prisma.notification.create({
        data: {
          userId,
          type: 'ANALYSIS_COMPLETE',
          title: result.stubMode ? 'Analiz tamamlandı (demo)' : 'AI analizi tamamlandı',
          body: result.stubMode
            ? 'Gemini API key tanımlı değil; demo modunda çalışıldı.'
            : `${result.reducibleFlags.length} azaltılabilir harcama tespit edildi. Toplam fırsat: ${Math.round(result.reducibleFlags.reduce((s, f) => s + f.reducible_amount, 0))} ₺`,
          payload: { runId: run.id, stubMode: result.stubMode ?? false },
        },
      });

      // 6. Pothos query include'ları ile yeniden çek
      return ctx.prisma.analysisRun.findUniqueOrThrow({
        ...query,
        where: { id: run.id },
      });
    },
  }),
);

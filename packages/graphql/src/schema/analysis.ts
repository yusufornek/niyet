/**
 * AnalysisRun + TransactionAnalysis tipleri.
 * runAnalysis mutation Faz 5'te (Gemini pipeline) doldurulur — şimdilik stub.
 */
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

// runAnalysis stub — Faz 5'te Gemini ile dolacak
builder.mutationField('runAnalysis', (t) =>
  t.prismaField({
    type: 'AnalysisRun',
    authScopes: { authenticated: true },
    description: "Gemini analizi tetikle. Faz 5'te tam implementasyon.",
    resolve: async (query, _root, _args, ctx) => {
      // STUB: gerçek Gemini call yok, sahte bir AnalysisRun kaydı oluşturuyor
      const txs = await ctx.prisma.transaction.findMany({
        where: { userId: ctx.userId! },
        select: { id: true, opportunity: true },
      });
      const totalOpp = txs.reduce(
        (s, t) => s + (t.opportunity != null ? Number(t.opportunity) : 0),
        0,
      );
      return ctx.prisma.analysisRun.create({
        ...query,
        data: {
          userId: ctx.userId!,
          geminiModel: 'stub-faz-5-pending',
          request: { note: "Gerçek Gemini entegrasyonu Faz 5'te eklenecek" },
          response: { note: 'stub' },
          durationMs: 0,
          totalTransactions: txs.length,
          totalOpportunity: Math.round(totalOpp),
        },
      });
    },
  }),
);

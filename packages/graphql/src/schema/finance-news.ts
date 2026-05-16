import { builder } from '../builder';

const FinanceNewsItemObject = builder.simpleObject('FinanceNewsItem', {
  fields: (t) => ({
    id: t.string(),
    title: t.string(),
    summaryShort: t.string(),
    sourceName: t.string(),
    sourceUrl: t.string(),
    publishedAt: t.field({ type: 'DateTime' }),
    isImportant: t.boolean(),
    importanceScore: t.int(),
  }),
});

builder.queryField('financeNewsFeed', (t) =>
  t.field({
    type: [FinanceNewsItemObject],
    args: {
      limit: t.arg.int({ defaultValue: 20 }),
      importantOnly: t.arg.boolean({ defaultValue: false }),
    },
    resolve: async (_root, args, ctx) => {
      const limit = Math.min(50, Math.max(1, args.limit ?? 20));
      const delegate = (ctx.prisma as { financeNewsItem?: { findMany: Function } }).financeNewsItem;
      const rows: Array<{
        id: string;
        title: string;
        summaryShort: string;
        sourceName: string;
        sourceUrl: string;
        publishedAt: Date;
        isImportant: boolean;
        importanceScore: number;
      }> = delegate
        ? await delegate.findMany({
            where: args.importantOnly ? { isImportant: true } : undefined,
            orderBy: { publishedAt: 'desc' },
            take: limit,
          })
        : args.importantOnly
          ? await ctx.prisma.$queryRaw<
              Array<{
                id: string;
                title: string;
                summaryShort: string;
                sourceName: string;
                sourceUrl: string;
                publishedAt: Date;
                isImportant: boolean;
                importanceScore: number;
              }>
            >`SELECT "id","title","summaryShort","sourceName","sourceUrl","publishedAt","isImportant","importanceScore"
              FROM "FinanceNewsItem"
              WHERE "isImportant" = true
              ORDER BY "publishedAt" DESC
              LIMIT ${limit}`
          : await ctx.prisma.$queryRaw<
              Array<{
                id: string;
                title: string;
                summaryShort: string;
                sourceName: string;
                sourceUrl: string;
                publishedAt: Date;
                isImportant: boolean;
                importanceScore: number;
              }>
            >`SELECT "id","title","summaryShort","sourceName","sourceUrl","publishedAt","isImportant","importanceScore"
              FROM "FinanceNewsItem"
              ORDER BY "publishedAt" DESC
              LIMIT ${limit}`;

      return rows.map((row) => ({
        id: row.id,
        title: row.title,
        summaryShort: row.summaryShort,
        sourceName: row.sourceName,
        sourceUrl: row.sourceUrl,
        publishedAt: row.publishedAt,
        isImportant: row.isImportant,
        importanceScore: row.importanceScore,
      }));
    },
  }),
);

builder.queryField('financeNewsItem', (t) =>
  t.field({
    type: FinanceNewsItemObject,
    nullable: true,
    args: {
      id: t.arg.id({ required: true }),
    },
    resolve: async (_root, args, ctx) => {
      const delegate = (ctx.prisma as { financeNewsItem?: { findUnique: Function } })
        .financeNewsItem;
      const row = delegate
        ? await delegate.findUnique({
            where: { id: String(args.id) },
          })
        : ((
            await ctx.prisma.$queryRaw<
              Array<{
                id: string;
                title: string;
                summaryShort: string;
                sourceName: string;
                sourceUrl: string;
                publishedAt: Date;
                isImportant: boolean;
                importanceScore: number;
              }>
            >`SELECT "id","title","summaryShort","sourceName","sourceUrl","publishedAt","isImportant","importanceScore"
              FROM "FinanceNewsItem"
              WHERE "id" = ${String(args.id)}
              LIMIT 1`
          )[0] ?? null);
      if (!row) return null;

      return {
        id: row.id,
        title: row.title,
        summaryShort: row.summaryShort,
        sourceName: row.sourceName,
        sourceUrl: row.sourceUrl,
        publishedAt: row.publishedAt,
        isImportant: row.isImportant,
        importanceScore: row.importanceScore,
      };
    },
  }),
);

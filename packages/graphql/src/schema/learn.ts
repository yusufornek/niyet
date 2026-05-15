import { builder } from '../builder';
import type { GraphQLContext } from '../context';
import { LearnService } from '../learn/service';

const LearnQuizItemObject = builder.simpleObject('LearnQuizItem', {
  fields: (t) => ({
    id: t.string(),
    question: t.string(),
    options: t.field({ type: ['String'] }),
    explanation: t.string(),
  }),
});

const LearnCardObject = builder.simpleObject('LearnCard', {
  fields: (t) => ({
    id: t.string(),
    orderNo: t.int(),
    title: t.string(),
    shortDescription: t.string(),
    body: t.string(),
    sourceName: t.string(),
    sourceUrl: t.string(),
    sourceUpdatedAt: t.field({ type: 'DateTime', nullable: true }),
    completed: t.boolean(),
    quizItems: t.field({ type: [LearnQuizItemObject] }),
  }),
});

const LearnUserStateObject = builder.simpleObject('LearnUserState', {
  fields: (t) => ({
    totalXp: t.int(),
    level: t.int(),
    streakDays: t.int(),
    lastActiveDate: t.field({ type: 'DateTime', nullable: true }),
  }),
});

const LearnLeaderboardEntryObject = builder.simpleObject('LearnLeaderboardEntry', {
  fields: (t) => ({
    userId: t.string(),
    userName: t.string(),
    totalXp: t.int(),
  }),
});

const LearnHomeObject = builder.simpleObject('LearnHome', {
  fields: (t) => ({
    packId: t.string(),
    packDate: t.field({ type: 'DateTime' }),
    summary: t.string(),
    state: t.field({ type: LearnUserStateObject }),
    cards: t.field({ type: [LearnCardObject] }),
    leaderboard: t.field({ type: [LearnLeaderboardEntryObject] }),
  }),
});

const LearnCompleteResultObject = builder.simpleObject('LearnCompleteResult', {
  fields: (t) => ({
    xpEarned: t.int(),
    quizScore: t.int(),
    state: t.field({ type: LearnUserStateObject }),
  }),
});

builder.queryField('learnHome', (t) =>
  t.field({
    type: LearnHomeObject,
    nullable: true,
    authScopes: { authenticated: true },
    args: {
      date: t.arg({ type: 'DateTime' }),
    },
    resolve: async (_root, args, ctx) => {
      const targetDate = args.date ?? ctx.now();
      const packDate = startOfDay(targetDate);
      const pack =
        (await ctx.prisma.learnDailyPack.findUnique({
          where: { packDate },
          include: {
            cards: {
              include: { quizItems: true },
              orderBy: { orderNo: 'asc' },
            },
          },
        })) ??
        (await ctx.prisma.learnDailyPack.findFirst({
          where: { status: 'PUBLISHED' },
          include: {
            cards: {
              include: { quizItems: true },
              orderBy: { orderNo: 'asc' },
            },
          },
          orderBy: { packDate: 'desc' },
        }));
      if (!pack) return null;

      const [state, progressRows, leaderboard] = await Promise.all([
        ensureLearnState(ctx),
        ctx.prisma.userLearnProgress.findMany({
          where: { userId: ctx.userId!, packId: pack.id },
          select: { cardId: true },
        }),
        learnService(ctx).getLeaderboardForUserCircles(ctx.userId!),
      ]);
      const completed = new Set(progressRows.map((p) => p.cardId));

      return {
        packId: pack.id,
        packDate: pack.packDate,
        summary: pack.summary,
        state: {
          totalXp: state.totalXp,
          level: state.level,
          streakDays: state.streakDays,
          lastActiveDate: state.lastActiveDate,
        },
        cards: pack.cards.map((card) => ({
          id: card.id,
          orderNo: card.orderNo,
          title: card.title,
          shortDescription: card.shortDescription,
          body: card.body,
          sourceName: card.sourceName,
          sourceUrl: card.sourceUrl,
          sourceUpdatedAt: card.sourceUpdatedAt,
          completed: completed.has(card.id),
          quizItems: card.quizItems.map((item) => ({
            id: item.id,
            question: item.question,
            options: (item.optionsJson as string[]) ?? [],
            explanation: item.explanationLlm ?? item.explanation,
          })),
        })),
        leaderboard,
      };
    },
  }),
);

builder.queryField('learnCard', (t) =>
  t.field({
    type: LearnCardObject,
    nullable: true,
    authScopes: { authenticated: true },
    args: { id: t.arg.id({ required: true }) },
    resolve: async (_root, args, ctx) => {
      const card = await ctx.prisma.learnCard.findUnique({
        where: { id: String(args.id) },
        include: { quizItems: true },
      });
      if (!card) return null;
      const progress = await ctx.prisma.userLearnProgress.findUnique({
        where: { userId_cardId: { userId: ctx.userId!, cardId: card.id } },
      });
      return {
        id: card.id,
        orderNo: card.orderNo,
        title: card.title,
        shortDescription: card.shortDescription,
        body: card.body,
        sourceName: card.sourceName,
        sourceUrl: card.sourceUrl,
        sourceUpdatedAt: card.sourceUpdatedAt,
        completed: !!progress,
        quizItems: card.quizItems.map((item) => ({
          id: item.id,
          question: item.question,
          options: (item.optionsJson as string[]) ?? [],
          explanation: item.explanationLlm ?? item.explanation,
        })),
      };
    },
  }),
);

builder.queryField('learnHistory', (t) =>
  t.field({
    type: [LearnHomeObject],
    authScopes: { authenticated: true },
    args: { limit: t.arg.int({ defaultValue: 10 }) },
    resolve: async (_root, args, ctx) => {
      const limit = Math.min(30, Math.max(1, args.limit ?? 10));
      const packs = await ctx.prisma.learnDailyPack.findMany({
        where: { status: 'PUBLISHED' },
        include: {
          cards: {
            include: { quizItems: true },
            orderBy: { orderNo: 'asc' },
          },
        },
        orderBy: { packDate: 'desc' },
        take: limit,
      });
      const state = await ensureLearnState(ctx);
      const leaderboard = await learnService(ctx).getLeaderboardForUserCircles(ctx.userId!);

      return Promise.all(
        packs.map(async (pack) => {
          const progressRows = await ctx.prisma.userLearnProgress.findMany({
            where: { userId: ctx.userId!, packId: pack.id },
            select: { cardId: true },
          });
          const completed = new Set(progressRows.map((p) => p.cardId));
          return {
            packId: pack.id,
            packDate: pack.packDate,
            summary: pack.summary,
            state: {
              totalXp: state.totalXp,
              level: state.level,
              streakDays: state.streakDays,
              lastActiveDate: state.lastActiveDate,
            },
            cards: pack.cards.map((card) => ({
              id: card.id,
              orderNo: card.orderNo,
              title: card.title,
              shortDescription: card.shortDescription,
              body: card.body,
              sourceName: card.sourceName,
              sourceUrl: card.sourceUrl,
              sourceUpdatedAt: card.sourceUpdatedAt,
              completed: completed.has(card.id),
              quizItems: card.quizItems.map((item) => ({
                id: item.id,
                question: item.question,
                options: (item.optionsJson as string[]) ?? [],
                explanation: item.explanationLlm ?? item.explanation,
              })),
            })),
            leaderboard,
          };
        }),
      );
    },
  }),
);

builder.mutationField('completeLearnCard', (t) =>
  t.field({
    type: LearnCompleteResultObject,
    authScopes: { authenticated: true },
    args: {
      cardId: t.arg.id({ required: true }),
      quizAnswers: t.arg({ type: ['Int'], required: true }),
    },
    resolve: async (_root, args, ctx) => {
      const result = await learnService(ctx).completeCard(
        ctx.userId!,
        String(args.cardId),
        args.quizAnswers ?? [],
      );
      return {
        xpEarned: result.xpEarned,
        quizScore: result.quizScore,
        state: {
          totalXp: result.state.totalXp,
          level: result.state.level,
          streakDays: result.state.streakDays,
          lastActiveDate: result.state.lastActiveDate,
        },
      };
    },
  }),
);

async function ensureLearnState(ctx: GraphQLContext) {
  return ctx.prisma.userLearnState.upsert({
    where: { userId: ctx.userId! },
    update: {},
    create: { userId: ctx.userId! },
  });
}

function learnService(ctx: GraphQLContext) {
  return new LearnService(ctx.prisma, ctx.now);
}

function startOfDay(value: Date): Date {
  const dt = new Date(value);
  dt.setHours(0, 0, 0, 0);
  return dt;
}

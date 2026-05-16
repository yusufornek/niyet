/**
 * ChatSession + ChatMessage + sendChatMessage mutation.
 *
 * Pattern B AI Saving Coach'u tetikler, sonucu DB'ye persist eder.
 */
import { runSavingCoach } from '@niyet/ai';
import { ChatRole } from '@prisma/client';

import { builder } from '../builder';

const ChatRoleRef = builder.enumType(ChatRole, { name: 'ChatRole' });

const CoachActionTypeRef = builder.enumType('CoachActionType', {
  values: ['ACCEPT_CATEGORY', 'CANCEL_SUBSCRIPTION', 'CREATE_RULE', 'OPEN_GOAL'] as const,
});

builder.prismaObject('ChatSession', {
  fields: (t) => ({
    id: t.exposeID('id'),
    title: t.exposeString('title', { nullable: true }),
    goalContext: t.exposeString('goalContext', { nullable: true }),
    geminiModel: t.exposeString('geminiModel'),
    totalTokens: t.exposeInt('totalTokens'),
    createdAt: t.expose('createdAt', { type: 'DateTime' }),
    updatedAt: t.expose('updatedAt', { type: 'DateTime' }),
    messages: t.relation('messages', {
      query: () => ({ orderBy: { createdAt: 'asc' } }),
    }),
  }),
});

builder.prismaObject('ChatMessage', {
  fields: (t) => ({
    id: t.exposeID('id'),
    role: t.expose('role', { type: ChatRoleRef }),
    content: t.exposeString('content'),
    toolName: t.exposeString('toolName', { nullable: true }),
    toolPayload: t.expose('toolPayload', { type: 'JSON', nullable: true }),
    tokensUsed: t.exposeInt('tokensUsed', { nullable: true }),
    createdAt: t.expose('createdAt', { type: 'DateTime' }),
  }),
});

const CoachRecommendationType = builder.simpleObject('CoachRecommendation', {
  description: "AI Saving Coach'un sohbet sonunda önerdiği aksiyon (UI'da CTA olur)",
  fields: (t) => ({
    actionType: t.field({ type: CoachActionTypeRef }),
    label: t.string(),
    targetRef: t.string({ nullable: true }),
    reasoning: t.string(),
  }),
});

const SendMessageResponse = builder.simpleObject('SendMessageResponse', {
  fields: (t) => ({
    sessionId: t.id(),
    reply: t.string(),
    recommendation: t.field({ type: CoachRecommendationType, nullable: true }),
    totalTokens: t.int(),
    geminiModel: t.string(),
    stubMode: t.boolean(),
  }),
});

// ─────────────────────────────────────────────────────────────
// Queries
// ─────────────────────────────────────────────────────────────

builder.queryField('chatSessions', (t) =>
  t.prismaField({
    type: ['ChatSession'],
    authScopes: { authenticated: true },
    args: { limit: t.arg.int({ defaultValue: 20 }) },
    resolve: async (query, _root, args, ctx) => {
      return ctx.prisma.chatSession.findMany({
        ...query,
        where: { userId: ctx.userId! },
        orderBy: { updatedAt: 'desc' },
        take: args.limit ?? 20,
      });
    },
  }),
);

builder.queryField('chatSession', (t) =>
  t.prismaField({
    type: 'ChatSession',
    nullable: true,
    authScopes: { authenticated: true },
    args: { id: t.arg.id({ required: true }) },
    resolve: async (query, _root, args, ctx) => {
      return ctx.prisma.chatSession.findFirst({
        ...query,
        where: { id: String(args.id), userId: ctx.userId! },
      });
    },
  }),
);

// ─────────────────────────────────────────────────────────────
// Mutations
// ─────────────────────────────────────────────────────────────

/**
 * Sohbete bir kullanıcı mesajı gönder. Yeni session yarat veya mevcuda ekle.
 * Gemini cevabını DB'ye persist eder ve döner.
 */
builder.mutationField('sendChatMessage', (t) =>
  t.field({
    type: SendMessageResponse,
    authScopes: { authenticated: true },
    args: {
      message: t.arg.string({ required: true }),
      sessionId: t.arg.id({ required: false }),
      goalContext: t.arg.string({ required: false }),
      /// Hedef bağlamı id'si — `simulate_goal_acceleration` tool'una iletilir.
      /// Persist edilmez (DB'de tutulmaz), runtime'da agent'a aktarılır.
      goalId: t.arg.id({ required: false }),
    },
    resolve: async (_root, args, ctx) => {
      const userId = ctx.userId!;
      const message = String(args.message).trim();
      if (!message) throw new Error('Mesaj boş olamaz.');

      // 1. Session: var olanı bul veya yeni yarat
      let session;
      if (args.sessionId) {
        session = await ctx.prisma.chatSession.findFirst({
          where: { id: String(args.sessionId), userId },
        });
        if (!session) throw new Error('Sohbet bulunamadı.');
      } else {
        session = await ctx.prisma.chatSession.create({
          data: {
            userId,
            title: message.length > 60 ? message.slice(0, 60) + '…' : message,
            goalContext: args.goalContext ?? null,
            geminiModel: 'pending',
          },
        });
      }

      // 2. History'i çek (son 20 mesaj, USER + ASSISTANT)
      const historyMsgs = await ctx.prisma.chatMessage.findMany({
        where: { sessionId: session.id, role: { in: ['USER', 'ASSISTANT'] } },
        orderBy: { createdAt: 'asc' },
        take: 20,
      });

      const history = historyMsgs.map((m) => ({
        role: m.role as 'USER' | 'ASSISTANT',
        content: m.content,
      }));

      // 3. User mesajını DB'ye yaz
      await ctx.prisma.chatMessage.create({
        data: {
          sessionId: session.id,
          role: 'USER',
          content: message,
        },
      });

      // 4. Coach agent'i çağır
      const result = await runSavingCoach({
        userId,
        userMessage: message,
        history,
        goalContext: session.goalContext,
        goalId: args.goalId != null ? String(args.goalId) : null,
      });

      // 5. Tool call'ları DB'ye yaz (transparency için)
      for (const tc of result.toolCalls) {
        await ctx.prisma.chatMessage.create({
          data: {
            sessionId: session.id,
            role: 'TOOL',
            content: typeof tc.result === 'string' ? tc.result : JSON.stringify(tc.result),
            toolName: tc.name,
            toolPayload: { args: tc.args, result: tc.result } as object,
          },
        });
      }

      // 6. Assistant cevabını yaz
      await ctx.prisma.chatMessage.create({
        data: {
          sessionId: session.id,
          role: 'ASSISTANT',
          content: result.reply,
          tokensUsed: result.totalTokens,
          toolPayload: result.recommendation
            ? ({ recommendation: result.recommendation } as object)
            : undefined,
        },
      });

      // 7. Session metadata güncelle
      await ctx.prisma.chatSession.update({
        where: { id: session.id },
        data: {
          geminiModel: result.geminiModel,
          totalTokens: { increment: result.totalTokens },
        },
      });

      return {
        sessionId: session.id,
        reply: result.reply,
        recommendation: result.recommendation,
        totalTokens: result.totalTokens,
        geminiModel: result.geminiModel,
        stubMode: result.stubMode ?? false,
      };
    },
  }),
);

builder.mutationField('deleteChatSession', (t) =>
  t.field({
    type: 'Boolean',
    authScopes: { authenticated: true },
    args: { id: t.arg.id({ required: true }) },
    resolve: async (_root, args, ctx) => {
      const userId = ctx.userId!;
      const s = await ctx.prisma.chatSession.findFirst({
        where: { id: String(args.id), userId },
        select: { id: true },
      });
      if (!s) throw new Error('Sohbet bulunamadı.');
      await ctx.prisma.chatSession.delete({ where: { id: s.id } });
      return true;
    },
  }),
);

/**
 * AI Saving Coach Agent (Pattern B) — multi-turn agent loop.
 *
 * Akış:
 *   1. User mesajı + history alınır
 *   2. Gemini'ye gönderilir (system prompt + tools + history)
 *   3. Gemini bir veya birden çok function call yapabilir
 *   4. Her tool call backend'de execute edilir, sonuç Gemini'ye geri verilir
 *   5. Max 3 turn iteration. Final text + recommendActions return edilir
 *   6. Caller mesajları DB'ye persist eder (ChatMessage)
 */
import { prisma, type SpendingCategory } from '@niyet/db';
import { calculateGoalAcceleration } from '@niyet/core';
import { type Content, type FunctionCall, type GenerateContentResponse } from '@google/genai';

import { GEMINI_MODEL, getGeminiClient } from '../client';
import { COACH_TOOLS } from '../functions/coach-tools';
import { SAVING_COACH_SYSTEM_PROMPT } from '../prompts/saving-coach';

// ─────────────────────────────────────────────────────────────
// Tool executor — Gemini'nin çağırdığı fonksiyonların gerçek DB karşılıkları
// ─────────────────────────────────────────────────────────────

async function executeTool(
  userId: string,
  name: string,
  args: Record<string, unknown>,
): Promise<unknown> {
  switch (name) {
    case 'get_dashboard_summary': {
      const since30 = new Date();
      since30.setDate(since30.getDate() - 30);
      const [txs, rulesCount, goalsCount, contribs] = await Promise.all([
        prisma.transaction.findMany({
          where: { userId, occurredAt: { gte: since30 } },
          select: { amount: true, opportunity: true },
        }),
        prisma.rule.count({ where: { userId, active: true } }),
        prisma.goal.count({ where: { userId, status: 'ACTIVE' } }),
        prisma.microContribution.findMany({
          where: { userId, status: { not: 'REVERSED' } },
          select: { amount: true },
        }),
      ]);
      return {
        last30dSpent: Math.round(txs.reduce((s, t) => s + Number(t.amount), 0)),
        last30dOpportunity: Math.round(
          txs.reduce((s, t) => s + (t.opportunity != null ? Number(t.opportunity) : 0), 0),
        ),
        txCount: txs.length,
        activeRulesCount: rulesCount,
        activeGoalsCount: goalsCount,
        totalAcceptedContributions: Math.round(contribs.reduce((s, c) => s + Number(c.amount), 0)),
      };
    }

    case 'get_category_breakdown': {
      const since30 = new Date();
      since30.setDate(since30.getDate() - 30);
      const txs = await prisma.transaction.findMany({
        where: { userId, occurredAt: { gte: since30 } },
        select: { category: true, amount: true, opportunity: true },
      });
      const map = new Map<
        SpendingCategory,
        { total: number; opportunity: number; count: number }
      >();
      for (const t of txs) {
        const cur = map.get(t.category) ?? { total: 0, opportunity: 0, count: 0 };
        cur.total += Number(t.amount);
        cur.opportunity += t.opportunity != null ? Number(t.opportunity) : 0;
        cur.count += 1;
        map.set(t.category, cur);
      }
      return Array.from(map.entries())
        .map(([category, v]) => ({
          category,
          total: Math.round(v.total),
          opportunity: Math.round(v.opportunity),
          count: v.count,
          avg: Math.round(v.total / Math.max(1, v.count)),
        }))
        .sort((a, b) => b.total - a.total);
    }

    case 'get_subscriptions': {
      const subs = await prisma.subscription.findMany({
        where: { userId },
        select: { id: true, name: true, amount: true, status: true },
      });
      return subs.map((s) => ({
        id: s.id,
        name: s.name,
        monthly: Math.round(Number(s.amount)),
        yearly: Math.round(Number(s.amount) * 12),
        status: s.status,
      }));
    }

    case 'get_goals_with_eta': {
      const goals = await prisma.goal.findMany({
        where: { userId, status: 'ACTIVE' },
        select: {
          id: true,
          name: true,
          current: true,
          currentPrice: true,
          monthlyContribution: true,
          targetDate: true,
        },
      });
      return goals.map((g) => {
        const remaining = Math.max(0, Number(g.currentPrice) - Number(g.current));
        const monthly = Math.max(1, Number(g.monthlyContribution));
        return {
          id: g.id,
          name: g.name,
          current: Math.round(Number(g.current)),
          target: Math.round(Number(g.currentPrice)),
          monthlyContribution: Math.round(monthly),
          etaMonths: Math.ceil(remaining / monthly),
          targetDate: g.targetDate.toISOString().slice(0, 10),
        };
      });
    }

    case 'get_category_transactions': {
      const cat = args.category as SpendingCategory;
      const since30 = new Date();
      since30.setDate(since30.getDate() - 30);
      const txs = await prisma.transaction.findMany({
        where: { userId, category: cat, occurredAt: { gte: since30 } },
        orderBy: { amount: 'desc' },
        take: 5,
        select: {
          merchant: true,
          amount: true,
          occurredAt: true,
          isReducible: true,
          opportunity: true,
        },
      });
      return txs.map((t) => ({
        merchant: t.merchant,
        amount: Math.round(Number(t.amount)),
        date: t.occurredAt.toISOString().slice(0, 10),
        isReducible: t.isReducible,
        opportunity: t.opportunity != null ? Math.round(Number(t.opportunity)) : null,
      }));
    }

    case 'simulate_goal_acceleration': {
      const goalId = typeof args.goal_id === 'string' ? args.goal_id : '';
      if (!goalId) {
        return { error: "goal_id parametresi zorunlu. Önce 'get_goals_with_eta' ile listele." };
      }
      const goal = await prisma.goal.findFirst({
        where: { id: goalId, userId },
        select: {
          id: true,
          name: true,
          current: true,
          currentPrice: true,
          monthlyContribution: true,
          targetDate: true,
        },
      });
      if (!goal) {
        return { error: 'Hedef bulunamadı veya erişim reddedildi.' };
      }
      // Son 30 gün opportunity'sini kategori bazında topla
      const since30 = new Date();
      since30.setDate(since30.getDate() - 30);
      const txs = await prisma.transaction.findMany({
        where: { userId, occurredAt: { gte: since30 } },
        select: { category: true, opportunity: true },
      });
      const oppMap = new Map<SpendingCategory, number>();
      for (const t of txs) {
        if (t.opportunity != null) {
          const v = Number(t.opportunity);
          if (v > 0) {
            oppMap.set(t.category, (oppMap.get(t.category) ?? 0) + v);
          }
        }
      }
      const categoryOpportunities = Array.from(oppMap.entries()).map(
        ([category, monthlyOpportunity]) => ({ category, monthlyOpportunity }),
      );

      const remainingAmount = Math.max(0, Number(goal.currentPrice) - Number(goal.current));
      const plan = calculateGoalAcceleration({
        remainingAmount,
        currentMonthlyContribution: Number(goal.monthlyContribution),
        categoryOpportunities,
      });
      // Infinity → null (Gemini için JSON-friendly)
      const finiteOrNull = (n: number) => (Number.isFinite(n) ? n : null);
      return {
        goal: {
          id: goal.id,
          name: goal.name,
          remainingAmount: Math.round(remainingAmount),
          monthlyContribution: Math.round(Number(goal.monthlyContribution)),
          targetDate: goal.targetDate.toISOString().slice(0, 10),
        },
        plan: {
          currentEtaMonths: finiteOrNull(plan.currentEtaMonths),
          categoryOptions: plan.categoryOptions.map((o) => ({
            category: o.category,
            monthlyOpportunity: o.monthlyOpportunity,
            reasonableMonthlyCut: o.reasonableMonthlyCut,
            newEtaMonths: finiteOrNull(o.newEtaMonths),
            monthsShaved: finiteOrNull(o.monthsShaved),
          })),
          topThreeCombined: {
            categories: plan.topThreeCombined.categories,
            totalMonthlyCut: plan.topThreeCombined.totalMonthlyCut,
            newEtaMonths: finiteOrNull(plan.topThreeCombined.newEtaMonths),
            monthsShaved: finiteOrNull(plan.topThreeCombined.monthsShaved),
          },
          easiestSingle: plan.easiestSingle
            ? {
                category: plan.easiestSingle.category,
                monthlyOpportunity: plan.easiestSingle.monthlyOpportunity,
                reasonableMonthlyCut: plan.easiestSingle.reasonableMonthlyCut,
                newEtaMonths: finiteOrNull(plan.easiestSingle.newEtaMonths),
                monthsShaved: finiteOrNull(plan.easiestSingle.monthsShaved),
              }
            : null,
        },
      };
    }

    case 'recommend_action': {
      // Sadece UI'a iletilen bir signal; backend hiçbir yan etki yapmaz
      return { acknowledged: true };
    }

    default:
      return { error: `Bilinmeyen tool: ${name}` };
  }
}

// ─────────────────────────────────────────────────────────────
// Public types
// ─────────────────────────────────────────────────────────────

export interface ChatHistoryItem {
  role: 'USER' | 'ASSISTANT';
  content: string;
}

export interface CoachToolCallTrace {
  name: string;
  args: Record<string, unknown>;
  result: unknown;
}

export interface CoachRecommendation {
  actionType: 'ACCEPT_CATEGORY' | 'CANCEL_SUBSCRIPTION' | 'CREATE_RULE' | 'OPEN_GOAL';
  label: string;
  targetRef: string | null;
  reasoning: string;
}

export interface CoachResult {
  reply: string;
  toolCalls: CoachToolCallTrace[];
  recommendation: CoachRecommendation | null;
  geminiModel: string;
  totalTokens: number;
  stubMode?: boolean;
  error?: string;
}

// ─────────────────────────────────────────────────────────────
// Stub mode fallback (API key yoksa)
// ─────────────────────────────────────────────────────────────

function stubCoachReply(userMessage: string): CoachResult {
  const m = userMessage.toLowerCase();
  let reply: string;
  if (m.includes('merhaba') || m.includes('selam')) {
    reply =
      'Merhaba! Tasarruf koçunum. Bugün hangi konuda yardım istersin — kategori analizi, hedefler veya abonelikler?';
  } else if (m.includes('kahve')) {
    reply =
      'Kahve harcamalarını birlikte gözden geçirelim. Haftada kaç kez dışarda kahve içiyorsun?';
  } else if (m.includes('abonelik')) {
    reply =
      'Aboneliklerini Abonelikler sayfasından görebilirsin. Kullanmadığını işaretle, yıllık tutarı katkıya aktaralım.';
  } else {
    reply =
      'Demo modundayım (Gemini API key tanımlı değil). Ortaya çıkan kalıba göre fikir verebilirim ama detaylı sohbet için key gerekli.';
  }
  return {
    reply,
    toolCalls: [],
    recommendation: null,
    geminiModel: 'stub-no-api-key',
    totalTokens: 0,
    stubMode: true,
  };
}

// ─────────────────────────────────────────────────────────────
// Agent loop (max 3 iteration)
// ─────────────────────────────────────────────────────────────

const MAX_ITERATIONS = 3;

export async function runSavingCoach(input: {
  userId: string;
  userMessage: string;
  history: ChatHistoryItem[];
  goalContext?: string | null;
  /// Goal sayfasından gelinmişse hedef id'si — `simulate_goal_acceleration` tool'una iletilir.
  goalId?: string | null;
}): Promise<CoachResult> {
  const client = getGeminiClient();
  if (!client) return stubCoachReply(input.userMessage);

  // History → Gemini Content[] formatı
  const contents: Content[] = [];
  if (input.goalContext) {
    const goalNote = input.goalId
      ? `(System note: kullanıcı şu hedef için sohbet ediyor: "${input.goalContext}". ` +
        `Hedef id: "${input.goalId}". Hedefe daha hızlı ulaşma sorulduğunda ` +
        `\`simulate_goal_acceleration\` tool'unu bu id ile çağır.)`
      : `(System note: kullanıcı şu hedef için sohbet ediyor: "${input.goalContext}")`;
    contents.push({
      role: 'user',
      parts: [{ text: goalNote }],
    });
    contents.push({
      role: 'model',
      parts: [{ text: 'Anladım, bu hedef bağlamında konuşacağım.' }],
    });
  }
  for (const m of input.history) {
    contents.push({
      role: m.role === 'USER' ? 'user' : 'model',
      parts: [{ text: m.content }],
    });
  }
  contents.push({ role: 'user', parts: [{ text: input.userMessage }] });

  const toolCalls: CoachToolCallTrace[] = [];
  let recommendation: CoachRecommendation | null = null;
  let totalTokens = 0;
  let finalReply = '';

  try {
    for (let iter = 0; iter < MAX_ITERATIONS; iter++) {
      const response: GenerateContentResponse = await client.models.generateContent({
        model: GEMINI_MODEL,
        contents,
        config: {
          systemInstruction: SAVING_COACH_SYSTEM_PROMPT,
          tools: [{ functionDeclarations: COACH_TOOLS }],
          temperature: 0.5,
          topP: 0.9,
          maxOutputTokens: 1500,
        },
      });

      totalTokens +=
        (response.usageMetadata?.promptTokenCount ?? 0) +
        (response.usageMetadata?.candidatesTokenCount ?? 0);

      const functionCalls: FunctionCall[] = response.functionCalls ?? [];

      if (functionCalls.length === 0) {
        // Text-only response — final
        finalReply = response.text ?? 'Cevap üretilemedi.';
        break;
      }

      // Tüm tool call'ları işle, sonuçları Gemini'ye geri ver
      const toolResponses: Content[] = [];
      contents.push({
        role: 'model',
        parts: functionCalls.map((fc) => ({
          functionCall: { name: fc.name ?? '', args: fc.args ?? {} },
        })),
      });

      for (const fc of functionCalls) {
        const name = fc.name ?? '';
        const args = (fc.args ?? {}) as Record<string, unknown>;
        const result = await executeTool(input.userId, name, args);

        // recommend_action özel — UI signal'i
        if (name === 'recommend_action') {
          recommendation = {
            actionType: args.action_type as CoachRecommendation['actionType'],
            label: String(args.label ?? ''),
            targetRef: args.target_ref != null ? String(args.target_ref) : null,
            reasoning: String(args.reasoning ?? ''),
          };
        }

        toolCalls.push({ name, args, result });
        toolResponses.push({
          role: 'user',
          parts: [
            {
              functionResponse: {
                name,
                response: { content: result },
              },
            },
          ],
        });
      }

      contents.push(...toolResponses);
      // Devam — Gemini sonuçlarla cevap üretmeli
    }

    if (!finalReply) {
      finalReply =
        'Daha fazla iterasyon gerekiyor ama limit doldu. Sorunu daha basit ifade edersen yardımcı olabilirim.';
    }

    return {
      reply: finalReply,
      toolCalls,
      recommendation,
      geminiModel: GEMINI_MODEL,
      totalTokens,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      reply: "Şu an Gemini'ye ulaşamıyorum. Birkaç saniye sonra tekrar dene.",
      toolCalls,
      recommendation: null,
      geminiModel: GEMINI_MODEL,
      totalTokens,
      error: message,
    };
  }
}

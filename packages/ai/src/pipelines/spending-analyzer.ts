/**
 * Spending Analyzer Agent — Pattern A pipeline.
 *
 * Akış:
 *  1. User'ın son 90 gün transaction'larını çek (caller'dan input gelir)
 *  2. Batch olarak Gemini'ye gönder (system prompt + tx list + function defs)
 *  3. Gemini her transaction için 0-N tool call yapar
 *  4. Her tool call'ı validate et (Zod) ve handler'a yolla
 *  5. Sonuçları döndür (caller DB'ye yazacak)
 *
 * Detay: ENGINEERING.md §12-13
 */
import { prisma, type Transaction, type SpendingCategory, type RuleFrequency } from '@niyet/db';
import {
  FlagReducibleArgsSchema,
  MarkSubscriptionArgsSchema,
  RecommendMicroSavingArgsSchema,
  SetCategoryArgsSchema,
} from '@niyet/core';
import { z } from 'zod';

import { GEMINI_MODEL, getGeminiClient } from '../client';
import { ALL_FUNCTIONS } from '../functions/definitions';
import { SPENDING_ANALYZER_PROMPT } from '../prompts/spending-analyzer';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export interface AnalyzerInput {
  userId: string;
  transactions: Pick<
    Transaction,
    'id' | 'amount' | 'merchant' | 'occurredAt' | 'category' | 'description'
  >[];
}

export interface CategoryUpdate {
  transaction_id: string;
  category: SpendingCategory;
  reasoning: string;
}
export interface SubscriptionMark {
  transaction_id: string;
  frequency: RuleFrequency;
  reasoning: string;
}
export interface ReducibleFlag {
  transaction_id: string;
  reducible_amount: number;
  reasoning: string;
}
export interface MicroSavingRecommendation {
  category: SpendingCategory;
  amount: number;
  period: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  reasoning: string;
}

export interface AnalyzerResult {
  ok: boolean;
  /** Gemini olmadan çalıştıysa true */
  stubMode?: boolean;
  error?: string;
  durationMs: number;
  totalTokens?: number;
  geminiModel: string;
  categoryUpdates: CategoryUpdate[];
  subscriptionMarks: SubscriptionMark[];
  reducibleFlags: ReducibleFlag[];
  recommendations: MicroSavingRecommendation[];
  /** Tam request payload (transparency için DB'ye yazılır) */
  requestPayload: unknown;
  /** Tam response payload */
  responsePayload: unknown;
}

// ─────────────────────────────────────────────────────────────
// Stub fallback (Gemini key olmadan demo akışı)
// ─────────────────────────────────────────────────────────────

function stubAnalysis(input: AnalyzerInput, startedAt: number): AnalyzerResult {
  // DB'de zaten isReducible işaretli olanları "Gemini'nin önerisi" olarak yansıt
  const reducibleFlags: ReducibleFlag[] = input.transactions
    .slice(0, 30)
    .filter((tx) => Number(tx.amount) > 50)
    .slice(0, 10)
    .map((tx) => ({
      transaction_id: tx.id,
      reducible_amount: Math.round(Number(tx.amount) * 0.5),
      reasoning: 'Stub mode (Gemini API key tanımlı değil). Demo amaçlı %50 reducible.',
    }));

  return {
    ok: true,
    stubMode: true,
    durationMs: Date.now() - startedAt,
    geminiModel: 'stub-no-api-key',
    categoryUpdates: [],
    subscriptionMarks: [],
    reducibleFlags,
    recommendations: [
      {
        category: 'COFFEE',
        amount: 600,
        period: 'MONTHLY',
        reasoning:
          'Demo (stub): Haftada 2 günü ev kahvesine çevirirsen ayda ~600 ₺ tasarruf edersin.',
      },
    ],
    requestPayload: { stub: true, txCount: input.transactions.length },
    responsePayload: {
      stub: true,
      note: "GEMINI_API_KEY env var'i set edilirse gercek analiz yapilir.",
    },
  };
}

// ─────────────────────────────────────────────────────────────
// Gerçek Gemini pipeline
// ─────────────────────────────────────────────────────────────

const ToolCallSchema = z.object({
  name: z.string(),
  args: z.unknown(),
});

export async function runSpendingAnalysis(input: AnalyzerInput): Promise<AnalyzerResult> {
  const startedAt = Date.now();
  const client = getGeminiClient();
  if (!client) return stubAnalysis(input, startedAt);

  // Transaction'ları compact JSON olarak hazırla
  const txPayload = input.transactions.map((tx) => ({
    id: tx.id,
    merchant: tx.merchant,
    amount: Number(tx.amount),
    date: tx.occurredAt.toISOString().slice(0, 10),
    category: tx.category,
  }));

  const userContent = `Aşağıdaki ${txPayload.length} transaction'ı analiz et:\n\n${JSON.stringify(
    txPayload,
    null,
    2,
  )}`;

  const categoryUpdates: CategoryUpdate[] = [];
  const subscriptionMarks: SubscriptionMark[] = [];
  const reducibleFlags: ReducibleFlag[] = [];
  const recommendations: MicroSavingRecommendation[] = [];

  let totalTokens = 0;
  let responseDump: unknown = null;

  try {
    const response = await client.models.generateContent({
      model: GEMINI_MODEL,
      contents: userContent,
      config: {
        systemInstruction: SPENDING_ANALYZER_PROMPT,
        tools: [{ functionDeclarations: ALL_FUNCTIONS }],
        temperature: 0.3,
        topP: 0.9,
        maxOutputTokens: 8000,
      },
    });

    responseDump = response;
    totalTokens =
      (response.usageMetadata?.promptTokenCount ?? 0) +
      (response.usageMetadata?.candidatesTokenCount ?? 0);

    // function call'ları çek
    const functionCalls = response.functionCalls ?? [];
    for (const fc of functionCalls) {
      const parsed = ToolCallSchema.safeParse(fc);
      if (!parsed.success) continue;

      try {
        switch (parsed.data.name) {
          case 'set_transaction_category': {
            const r = SetCategoryArgsSchema.parse(parsed.data.args);
            categoryUpdates.push({
              transaction_id: r.transaction_id,
              category: r.category,
              reasoning: r.reasoning,
            });
            break;
          }
          case 'mark_as_subscription': {
            const r = MarkSubscriptionArgsSchema.parse(parsed.data.args);
            subscriptionMarks.push({
              transaction_id: r.transaction_id,
              frequency: r.frequency,
              reasoning: r.reasoning,
            });
            break;
          }
          case 'flag_reducible': {
            const r = FlagReducibleArgsSchema.parse(parsed.data.args);
            reducibleFlags.push({
              transaction_id: r.transaction_id,
              reducible_amount: r.reducible_amount,
              reasoning: r.reasoning,
            });
            break;
          }
          case 'recommend_micro_saving': {
            const r = RecommendMicroSavingArgsSchema.parse(parsed.data.args);
            recommendations.push({
              category: r.category,
              amount: r.amount,
              period: r.period,
              reasoning: r.reasoning,
            });
            break;
          }
        }
      } catch (parseErr) {
        // Tek function call'ın schema'sı bozuksa logla ama batch'i kırma
        console.warn('Gemini function call schema mismatch:', parsed.data.name, parseErr);
      }
    }

    return {
      ok: true,
      durationMs: Date.now() - startedAt,
      totalTokens,
      geminiModel: GEMINI_MODEL,
      categoryUpdates,
      subscriptionMarks,
      reducibleFlags,
      recommendations,
      requestPayload: {
        model: GEMINI_MODEL,
        systemPromptVersion: 'spending-analyzer/v1',
        txCount: txPayload.length,
      },
      responsePayload: responseDump,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      error: message,
      durationMs: Date.now() - startedAt,
      geminiModel: GEMINI_MODEL,
      categoryUpdates: [],
      subscriptionMarks: [],
      reducibleFlags: [],
      recommendations: [],
      requestPayload: { error: 'pipeline-failed' },
      responsePayload: { error: message },
    };
  }
}

// ─────────────────────────────────────────────────────────────
// Result'ı DB'ye yansıt (caller'dan)
// ─────────────────────────────────────────────────────────────

export async function persistAnalysisResult(userId: string, result: AnalyzerResult) {
  const totalOpportunity = result.reducibleFlags.reduce((s, f) => s + f.reducible_amount, 0);

  const run = await prisma.analysisRun.create({
    data: {
      userId,
      geminiModel: result.geminiModel,
      request: result.requestPayload as object,
      response: result.responsePayload as object,
      durationMs: result.durationMs,
      totalTransactions: result.categoryUpdates.length + result.reducibleFlags.length,
      totalOpportunity,
      totalTokens: result.totalTokens ?? null,
      error: result.error ?? null,
    },
  });

  // Her bir flag/category update için TransactionAnalysis + Transaction güncelle
  const allTxIds = new Set<string>([
    ...result.categoryUpdates.map((c) => c.transaction_id),
    ...result.reducibleFlags.map((f) => f.transaction_id),
    ...result.subscriptionMarks.map((m) => m.transaction_id),
  ]);

  for (const txId of allTxIds) {
    const catUpdate = result.categoryUpdates.find((c) => c.transaction_id === txId);
    const subMark = result.subscriptionMarks.find((s) => s.transaction_id === txId);
    const reducible = result.reducibleFlags.find((r) => r.transaction_id === txId);

    // Authorization: tx user'a ait olmalı (filter eklenir)
    const txExists = await prisma.transaction.findFirst({
      where: { id: txId, userId },
      select: { id: true },
    });
    if (!txExists) continue;

    await prisma.transactionAnalysis.create({
      data: {
        runId: run.id,
        transactionId: txId,
        suggestedCategory: catUpdate?.category ?? null,
        markedSubscription: !!subMark,
        reducibleAmount: reducible?.reducible_amount ?? null,
        reasoning: reducible?.reasoning ?? catUpdate?.reasoning ?? subMark?.reasoning ?? null,
      },
    });

    // Transaction'ı doğrudan güncelle (kullanıcı düzeltmediyse)
    const updateData: Record<string, unknown> = {};
    if (catUpdate) updateData.category = catUpdate.category;
    if (subMark) updateData.isRecurring = true;
    if (reducible) {
      updateData.isReducible = true;
      updateData.opportunity = reducible.reducible_amount;
    }
    if (Object.keys(updateData).length > 0) {
      await prisma.transaction.update({
        where: { id: txId },
        data: updateData,
      });
    }
  }

  return run;
}

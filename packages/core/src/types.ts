/**
 * @niyet/core/types — Zod schema'lar ve paylaşımlı TypeScript tipler.
 *
 * Tasarım kararı: Prisma type'larını burada YENİDEN tanımlamıyoruz; onları
 * doğrudan @niyet/db'den import edip kullanıyoruz. Buradaki schema'lar:
 * - boundary validation (Zod)
 * - GraphQL input/output (Pothos şimdilik bağımsız)
 * - AI function call args validation
 */
import { z } from 'zod';

import { SPENDING_CATEGORIES } from './constants';

// ─────────────────────────────────────────────────────────────
// Enum schemas (Prisma enum'ları ile eş — string-based)
// ─────────────────────────────────────────────────────────────

export const SpendingCategorySchema = z.enum(SPENDING_CATEGORIES);
export type SpendingCategory = z.infer<typeof SpendingCategorySchema>;

export const RuleFrequencySchema = z.enum(['WEEKLY', 'MONTHLY', 'PAYDAY', 'ONE_TIME']);
export type RuleFrequency = z.infer<typeof RuleFrequencySchema>;

export const SubscriptionStatusSchema = z.enum(['ACTIVE', 'CANCELLABLE', 'CANCELED']);
export type SubscriptionStatus = z.infer<typeof SubscriptionStatusSchema>;

export const GoalStatusSchema = z.enum(['ACTIVE', 'PAUSED', 'ACHIEVED']);
export type GoalStatus = z.infer<typeof GoalStatusSchema>;

// ─────────────────────────────────────────────────────────────
// Domain schemas
// ─────────────────────────────────────────────────────────────

export const TransactionInputSchema = z.object({
  accountId: z.string().min(1),
  amount: z.number().positive(),
  merchant: z.string().min(1).max(200),
  description: z.string().max(500).optional(),
  occurredAt: z.coerce.date(),
  category: SpendingCategorySchema,
});
export type TransactionInput = z.infer<typeof TransactionInputSchema>;

export const GoalInputSchema = z.object({
  name: z.string().min(1).max(120),
  basePrice: z.number().positive(),
  targetDate: z.coerce.date(),
  inflationPct: z.number().min(0).max(200).default(32),
  monthlyContribution: z.number().nonnegative().default(0),
});
export type GoalInput = z.infer<typeof GoalInputSchema>;

export const RuleInputSchema = z.object({
  label: z.string().min(1).max(100),
  amount: z.number().positive(),
  frequency: RuleFrequencySchema,
});
export type RuleInput = z.infer<typeof RuleInputSchema>;

// ─────────────────────────────────────────────────────────────
// AI Function Calling — Gemini tool call argument schemas
// (Pattern A: Spending Analyzer)
// ─────────────────────────────────────────────────────────────

export const SetCategoryArgsSchema = z.object({
  transaction_id: z.string().min(1),
  category: SpendingCategorySchema,
  reasoning: z.string().min(1).max(500),
});

export const MarkSubscriptionArgsSchema = z.object({
  transaction_id: z.string().min(1),
  frequency: RuleFrequencySchema,
  reasoning: z.string().min(1).max(500),
});

export const FlagReducibleArgsSchema = z.object({
  transaction_id: z.string().min(1),
  reducible_amount: z.number().nonnegative(),
  reasoning: z.string().min(1).max(500),
});

export const RecommendMicroSavingArgsSchema = z.object({
  category: SpendingCategorySchema,
  amount: z.number().positive(),
  period: z.enum(['DAILY', 'WEEKLY', 'MONTHLY']),
  reasoning: z.string().min(1).max(500),
});

// ─────────────────────────────────────────────────────────────
// Helper türler
// ─────────────────────────────────────────────────────────────

export type Period = 'LAST_7D' | 'LAST_30D' | 'LAST_90D' | 'ALL';

export interface CategoryBreakdown {
  category: SpendingCategory;
  total: number;
  opportunity: number;
  avg: number;
  count: number;
}

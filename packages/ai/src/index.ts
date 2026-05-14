/**
 * @niyet/ai — Gemini integration + agentic patterns.
 *
 * Pattern A: Spending Analyzer (batch function calling)
 * Pattern B: AI Saving Coach (multi-turn agent loop)
 *
 * Detay: ENGINEERING.md §12-13
 */
export { GEMINI_MODEL, getGeminiClient } from './client';

// Pattern A — Spending Analyzer
export {
  ALL_FUNCTIONS,
  FLAG_REDUCIBLE_FUNCTION,
  MARK_SUBSCRIPTION_FUNCTION,
  RECOMMEND_MICRO_SAVING_FUNCTION,
  SET_CATEGORY_FUNCTION,
} from './functions/definitions';
export { SPENDING_ANALYZER_PROMPT } from './prompts/spending-analyzer';
export {
  persistAnalysisResult,
  runSpendingAnalysis,
  type AnalyzerInput,
  type AnalyzerResult,
  type CategoryUpdate,
  type MicroSavingRecommendation,
  type ReducibleFlag,
  type SubscriptionMark,
} from './pipelines/spending-analyzer';

// Pattern B — AI Saving Coach
export { COACH_TOOLS } from './functions/coach-tools';
export { SAVING_COACH_SYSTEM_PROMPT } from './prompts/saving-coach';
export {
  runSavingCoach,
  type ChatHistoryItem,
  type CoachRecommendation,
  type CoachResult,
  type CoachToolCallTrace,
} from './agents/saving-coach';
export {
  GeminiQueryRewriteAdapter,
  type ProductQueryRewriteAdapter,
  type QueryRewriteAdapterOptions,
} from './query-normalizer';

export const AI_PACKAGE_VERSION = '0.2.0';

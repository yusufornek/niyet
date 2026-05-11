/**
 * @niyet/ai — Gemini integration + agentic patterns.
 *
 * Faz 5: Spending Analyzer Agent (Pattern A) tamamlandı.
 * Pattern B (AI Saving Coach) ve Pattern C (Goal Forecaster) sonraki fazlarda.
 *
 * Detay: ENGINEERING.md §12-13
 */
export { GEMINI_MODEL, getGeminiClient } from './client';
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

export const AI_PACKAGE_VERSION = '0.1.0';

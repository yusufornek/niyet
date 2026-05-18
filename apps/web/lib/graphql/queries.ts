/**
 * Niyet GraphQL queries + mutations + hooks.
 *
 * Bir tane dosyada tutuyoruz çünkü API yüzeyi orta ölçek (13 query + 5 mutation).
 * Codegen Faz 10'da eklenebilir; şimdilik manuel TypeScript tipleri yeterli.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { gqlFetcher } from './client';

// ─────────────────────────────────────────────────────────────
// Tip tanımları (GraphQL responses)
// ─────────────────────────────────────────────────────────────

export type SpendingCategory =
  | 'MARKET'
  | 'FOOD_DELIVERY'
  | 'COFFEE'
  | 'DINING_OUT'
  | 'TRANSPORT'
  | 'FUEL'
  | 'BILLS'
  | 'SUBSCRIPTIONS'
  | 'ONLINE_SHOPPING'
  | 'CLOTHING'
  | 'HEALTH'
  | 'ENTERTAINMENT'
  | 'EDUCATION'
  | 'SPORTS'
  | 'OTHER';

export type GoalStatus = 'ACTIVE' | 'PAUSED' | 'ACHIEVED';
export type SubscriptionStatus = 'ACTIVE' | 'CANCELLABLE' | 'CANCELED';
export type NotificationType =
  | 'SPENDING_ALERT'
  | 'GOAL_MILESTONE'
  | 'GOAL_PRICE_ALERT'
  | 'LEARN_UPDATE'
  | 'FINANCE_NEWS_IMPORTANT'
  | 'AI_INSIGHT'
  | 'ANALYSIS_COMPLETE'
  | 'RULE_TRIGGERED'
  | 'CONTRIBUTION_ACCEPTED';
export type Period = 'LAST_7D' | 'LAST_30D' | 'LAST_90D' | 'ALL';

export interface DashboardStats {
  totalSpentLast30d: number;
  totalOpportunityLast30d: number;
  txCountLast30d: number;
  weeklySaved: number;
  activeRulesCount: number;
  activeGoalsCount: number;
  totalAcceptedContributions: number;
  acceptedContributionsLast30d: number;
  todayOpportunity: number;
}

export type ContributionSource =
  | 'REDUCIBLE_TRANSACTION'
  | 'CATEGORY_BUCKET'
  | 'MANUAL'
  | 'RULE_TRIGGERED';

export type ContributionStatus = 'PENDING' | 'COMMITTED' | 'REVERSED';

export interface MicroContribution {
  id: string;
  amount: number;
  category: SpendingCategory | null;
  source: ContributionSource;
  status: ContributionStatus;
  sourceRef: string | null;
  note: string | null;
  createdAt: string;
  committedAt: string | null;
  reversedAt: string | null;
  transaction?: { id: string; merchant: string; amount: number } | null;
  goal?: { id: string; name: string } | null;
}

export interface ContributionSummary {
  totalAccepted: number;
  totalCommitted: number;
  totalPending: number;
  count: number;
  last30dAmount: number;
  last30dCount: number;
}

export type ChatRole = 'USER' | 'ASSISTANT' | 'TOOL';
export type CoachActionType =
  | 'ACCEPT_CATEGORY'
  | 'CANCEL_SUBSCRIPTION'
  | 'CREATE_RULE'
  | 'OPEN_GOAL';

export interface ChatMsg {
  id: string;
  role: ChatRole;
  content: string;
  toolName: string | null;
  tokensUsed: number | null;
  createdAt: string;
}

export interface ChatSession {
  id: string;
  title: string | null;
  goalContext: string | null;
  geminiModel: string;
  totalTokens: number;
  createdAt: string;
  updatedAt: string;
  messages?: ChatMsg[];
}

export interface CoachRecommendation {
  actionType: CoachActionType;
  label: string;
  targetRef: string | null;
  reasoning: string;
}

export interface SendMessageResponse {
  sessionId: string;
  reply: string;
  recommendation: CoachRecommendation | null;
  totalTokens: number;
  geminiModel: string;
  stubMode: boolean;
}

export interface PauseStatus {
  isPaused: boolean;
  pausedUntil: string | null;
  remainingDays: number | null;
  summary: string;
}

export interface Me {
  id: string;
  email: string;
  name: string;
  age: number;
  monthlyIncome: number;
  pausedUntil?: string | null;
  pauseStatus?: PauseStatus;
}

export interface CategoryBreakdownRow {
  category: SpendingCategory;
  total: number;
  opportunity: number;
  avg: number;
  count: number;
}

export interface Transaction {
  id: string;
  amount: number;
  merchant: string;
  description: string | null;
  occurredAt: string;
  category: SpendingCategory;
  categoryEdited: boolean;
  isRecurring: boolean;
  isReducible: boolean;
  opportunity: number | null;
  isAccepted: boolean;
}

export interface Subscription {
  id: string;
  name: string;
  amount: number;
  frequency: 'WEEKLY' | 'MONTHLY' | 'PAYDAY' | 'ONE_TIME';
  status: SubscriptionStatus;
  detectedAt: string;
  merchantPattern: string | null;
  yearlyAmount: number;
}

export interface SubscriptionSummaryData {
  activeCount: number;
  cancellableCount: number;
  canceledCount: number;
  activeMonthlyTotal: number;
  activeYearlyTotal: number;
  potentialMonthlySavings: number;
  potentialYearlySavings: number;
}

export interface GoalCheckpoint {
  id: string;
  percent: number;
  label: string;
  reached: boolean;
  reachedAt: string | null;
}

export type GoalPlanLevel = 'ON_TRACK' | 'STRETCH' | 'AT_RISK';

export interface GoalSavingsPlan {
  requiredMonthlyContribution: number;
  suggestedMonthlyContribution: number;
  monthlyGap: number;
  /** null = ulaşılmıyor (katkı 0 veya Infinity) */
  projectedMonthsToGoal: number | null;
  targetMonthsRemaining: number;
  level: GoalPlanLevel;
  summary: string;
}

export interface ContributionTimelinePoint {
  periodStart: string; // YYYY-MM-01
  periodAmount: number;
  cumulativeAmount: number;
}

export interface Goal {
  id: string;
  name: string;
  basePrice: number;
  currentPrice: number;
  inflationPct: number;
  targetDate: string;
  current: number;
  monthlyContribution: number;
  status: GoalStatus;
  autoUpdate: boolean;
  checkpoints?: GoalCheckpoint[];
  priceHistory?: Array<{ date: string; price: number }>;
  rawQuery?: string | null;
  normalizedQuery?: string | null;
  category?: string | null;
  selectedProductTitle?: string | null;
  productUrl?: string | null;
  productImage?: string | null;
  productSource?: string | null;
  currency?: string;
  lastCheckedAt?: string | null;
  nextPriceCheckAt?: string | null;
  planSummary?: string | null;
  planGeneratedAt?: string | null;
  trackedProgress?: number;
  trackedRemainingAmount?: number;
  savingsPlan?: GoalSavingsPlan;
  contributionTimeline?: ContributionTimelinePoint[];
}

export interface ProductQueryNormalization {
  rawQuery: string;
  normalizedQuery: string;
  category: string | null;
  confidence: number;
  source: string;
}

export interface ProductSearchResult {
  title: string;
  url: string;
  image: string | null;
  source: string;
  price: number;
  currency: string;
}

export interface GoalPriceAlert {
  id: string;
  goalId: string;
  oldPrice: number;
  newPrice: number;
  percentageChange: number;
  direction: 'INCREASE' | 'DECREASE';
  remainingAmountImpact: number;
  monthlySavingNeeded: number;
  readAt: string | null;
  createdAt: string;
}

export interface GoalPriceRefreshResult {
  goal: Goal;
  message: string | null;
  alert: GoalPriceAlert | null;
}

export type RiskProfile = 'VERY_LOW' | 'LOW' | 'BALANCED' | 'HIGH' | 'VERY_HIGH';

export interface FundRecommendation {
  id: string;
  name: string;
  summary: string;
  riskBand: RiskProfile;
  horizonBand: 'SHORT' | 'MEDIUM' | 'LONG';
  expectedReturnBand: string;
  whyFits: string;
  score: number;
}

export interface InflationRate {
  annualRate: number;
  monthlyRate: number | null;
  period: string;
  publishedAt: string;
  source: string;
  sourceUrl: string;
}

export interface FutureScore {
  id: string;
  score: number;
  contribution: number;
  discipline: number;
  consistency: number;
  social: number;
  computedAt: string;
}

export interface FutureScoreDriver {
  metric: string;
  delta: number;
  direction: 'UP' | 'DOWN' | 'FLAT';
}

export interface UserBadge {
  key: string;
  title: string;
  unlockedAt: string;
}

export interface FutureScoreInsights {
  current: FutureScore | null;
  previous: FutureScore | null;
  delta: number;
  label: string;
  status: string;
  topDriver: FutureScoreDriver;
  badges: UserBadge[];
}

export interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  read: boolean;
  payload: unknown | null;
  createdAt: string;
}

export interface AnalysisRunItem {
  id: string;
  triggeredAt: string;
  geminiModel: string;
  durationMs: number;
  totalTransactions: number;
  totalOpportunity: number;
  error: string | null;
}

export interface TransactionAnalysisDetail {
  id: string;
  suggestedCategory: SpendingCategory | null;
  markedSubscription: boolean;
  reducibleAmount: number | null;
  reasoning: string | null;
  transaction: {
    id: string;
    merchant: string;
    amount: number;
    category: SpendingCategory;
    occurredAt: string;
  };
}

export interface AnalysisRunDetail extends AnalysisRunItem {
  totalTokens: number | null;
  transactionAnalyses: TransactionAnalysisDetail[];
}

// Circle interface — full tanım dosya sonunda (savings circles PBI bölümü).

export interface LearnQuizItem {
  id: string;
  question: string;
  options: string[];
  explanation: string;
}

export interface LearnCard {
  id: string;
  orderNo: number;
  title: string;
  shortDescription: string;
  body: string;
  sourceName: string;
  sourceUrl: string;
  sourceUpdatedAt: string | null;
  completed: boolean;
  quizItems: LearnQuizItem[];
}

export interface LearnUserState {
  totalXp: number;
  level: number;
  streakDays: number;
  lastActiveDate: string | null;
}

export interface LearnLeaderboardEntry {
  userId: string;
  userName: string;
  totalXp: number;
}

export interface LearnHome {
  packId: string;
  packDate: string;
  summary: string;
  state: LearnUserState;
  cards: LearnCard[];
  leaderboard: LearnLeaderboardEntry[];
}

export interface FinanceNewsItem {
  id: string;
  title: string;
  summaryShort: string;
  sourceName: string;
  sourceUrl: string;
  publishedAt: string;
  isImportant: boolean;
  importanceScore: number;
}

// ─────────────────────────────────────────────────────────────
// Query string'leri
// ─────────────────────────────────────────────────────────────

const ME_Q = `query Me {
  me {
    id email name age monthlyIncome
    pausedUntil
    pauseStatus { isPaused pausedUntil remainingDays summary }
  }
}`;
const DASHBOARD_Q = `query Dashboard {
  dashboard {
    totalSpentLast30d totalOpportunityLast30d txCountLast30d weeklySaved
    activeRulesCount activeGoalsCount
    totalAcceptedContributions acceptedContributionsLast30d
    todayOpportunity
  }
}`;
const CATEGORY_BREAKDOWN_Q = `query CategoryBreakdown($period: Period!) {
  categoryBreakdown(period: $period) { category total opportunity avg count }
}`;
const TRANSACTIONS_Q = `query Transactions($period: Period, $category: SpendingCategory, $take: Int) {
  transactions(period: $period, category: $category, take: $take) {
    id amount merchant description occurredAt category categoryEdited
    isRecurring isReducible opportunity isAccepted
  }
}`;

const MICRO_CONTRIBUTIONS_Q = `query MicroContributions($limit: Int, $statusFilter: ContributionStatus, $categoryFilter: SpendingCategory) {
  microContributions(limit: $limit, statusFilter: $statusFilter, categoryFilter: $categoryFilter) {
    id amount category source status sourceRef note createdAt committedAt
    transaction { id merchant amount }
    goal { id name }
  }
}`;

const CONTRIBUTION_SUMMARY_Q = `query ContributionSummary {
  contributionSummary {
    totalAccepted totalCommitted totalPending count last30dAmount last30dCount
  }
}`;

const ACCEPT_TX_CONTRIB_M = `mutation AcceptTxContribution($transactionId: ID!, $amount: Float, $goalId: ID, $note: String) {
  acceptTransactionContribution(transactionId: $transactionId, amount: $amount, goalId: $goalId, note: $note) {
    id amount status category createdAt
  }
}`;

const ACCEPT_CATEGORY_CONTRIB_M = `mutation AcceptCategoryContribution($category: SpendingCategory!, $goalId: ID) {
  acceptCategoryContribution(category: $category, goalId: $goalId) {
    id amount status category createdAt
  }
}`;

const REVERSE_CONTRIB_M = `mutation ReverseContribution($id: ID!) {
  reverseContribution(id: $id) { id status reversedAt }
}`;

const CHAT_SESSIONS_Q = `query ChatSessions($limit: Int) {
  chatSessions(limit: $limit) {
    id title goalContext geminiModel totalTokens createdAt updatedAt
  }
}`;
const CHAT_SESSION_Q = `query ChatSession($id: ID!) {
  chatSession(id: $id) {
    id title goalContext geminiModel totalTokens
    messages { id role content toolName tokensUsed createdAt }
  }
}`;
const SEND_CHAT_M = `mutation SendChatMessage($message: String!, $sessionId: ID, $goalContext: String, $goalId: ID) {
  sendChatMessage(message: $message, sessionId: $sessionId, goalContext: $goalContext, goalId: $goalId) {
    sessionId reply totalTokens geminiModel stubMode
    recommendation { actionType label targetRef reasoning }
  }
}`;
const DELETE_CHAT_M = `mutation DeleteChatSession($id: ID!) {
  deleteChatSession(id: $id)
}`;
const SUBSCRIPTIONS_Q = `query Subscriptions {
  subscriptions { id name amount frequency status detectedAt merchantPattern yearlyAmount }
}`;
const SUBSCRIPTION_SUMMARY_Q = `query SubscriptionSummary {
  subscriptionSummary {
    activeCount cancellableCount canceledCount
    activeMonthlyTotal activeYearlyTotal
    potentialMonthlySavings potentialYearlySavings
  }
}`;
const MARK_SUB_STATUS_M = `mutation MarkSubscriptionStatus($id: ID!, $status: SubscriptionStatus!) {
  markSubscriptionStatus(id: $id, status: $status) { id status }
}`;
const CANCEL_SUB_M = `mutation CancelSubscription($id: ID!, $contributionAmount: Float) {
  cancelSubscription(id: $id, contributionAmount: $contributionAmount) {
    id name status yearlyAmount
  }
}`;
const GOALS_Q = `query Goals {
  goals {
    id name basePrice currentPrice inflationPct targetDate current
    monthlyContribution status autoUpdate planSummary planGeneratedAt
  }
}`;
const GOAL_Q = `query Goal($id: ID!) {
  goal(id: $id) {
    id name basePrice currentPrice inflationPct targetDate current
    monthlyContribution status autoUpdate priceHistory planSummary planGeneratedAt
    rawQuery normalizedQuery category selectedProductTitle productUrl
    productImage productSource currency lastCheckedAt nextPriceCheckAt
    trackedProgress trackedRemainingAmount
    checkpoints { id percent label reached reachedAt }
    savingsPlan {
      requiredMonthlyContribution suggestedMonthlyContribution monthlyGap
      projectedMonthsToGoal targetMonthsRemaining level summary
    }
    contributionTimeline { periodStart periodAmount cumulativeAmount }
  }
}`;
const GOAL_PRICE_ALERTS_Q = `query GoalPriceAlerts($unreadOnly: Boolean) {
  goalPriceAlerts(unreadOnly: $unreadOnly) {
    id goalId oldPrice newPrice percentageChange direction
    remainingAmountImpact monthlySavingNeeded readAt createdAt
  }
}`;
const FUND_RECOMMENDATIONS_Q = `query FundRecommendations($input: FundRecommendationInput!) {
  fundRecommendations(input: $input) {
    id name summary riskBand horizonBand expectedReturnBand whyFits score
  }
}`;
const LATEST_INFLATION_RATE_Q = `query LatestInflationRate {
  latestInflationRate {
    annualRate monthlyRate period publishedAt source sourceUrl
  }
}`;
const FUTURE_SCORE_Q = `query FutureScore {
  futureScore { id score contribution discipline consistency social computedAt }
}`;
const FUTURE_SCORE_INSIGHTS_Q = `query FutureScoreInsights {
  futureScoreInsights {
    current { id score contribution discipline consistency social computedAt }
    previous { id score contribution discipline consistency social computedAt }
    delta
    label
    status
    topDriver { metric delta direction }
    badges { key title unlockedAt }
  }
}`;
const NOTIFICATIONS_Q = `query Notifications($unreadOnly: Boolean) {
  notifications(unreadOnly: $unreadOnly) {
    id type title body read payload createdAt
  }
}`;
const ANALYSIS_HISTORY_Q = `query AnalysisHistory($limit: Int) {
  analysisHistory(limit: $limit) {
    id triggeredAt geminiModel durationMs totalTransactions totalOpportunity error
  }
}`;
const ANALYSIS_RUN_Q = `query AnalysisRun($id: ID!) {
  analysisRun(id: $id) {
    id triggeredAt geminiModel durationMs totalTransactions totalOpportunity error totalTokens
    transactionAnalyses {
      id suggestedCategory markedSubscription reducibleAmount reasoning
      transaction { id merchant amount category occurredAt }
    }
  }
}`;
// CIRCLES_Q — dosya sonundaki savings circles PBI bölümünde.
const LEARN_HOME_Q = `query LearnHome($date: DateTime) {
  learnHome(date: $date) {
    packId packDate summary
    state { totalXp level streakDays lastActiveDate }
    leaderboard { userId userName totalXp }
    cards {
      id orderNo title shortDescription body sourceName sourceUrl sourceUpdatedAt completed
      quizItems { id question options explanation }
    }
  }
}`;
const LEARN_CARD_Q = `query LearnCard($id: ID!) {
  learnCard(id: $id) {
    id orderNo title shortDescription body sourceName sourceUrl sourceUpdatedAt completed
    quizItems { id question options explanation }
  }
}`;
const LEARN_HISTORY_Q = `query LearnHistory($limit: Int) {
  learnHistory(limit: $limit) {
    packId packDate summary
    state { totalXp level streakDays lastActiveDate }
    leaderboard { userId userName totalXp }
    cards {
      id orderNo title shortDescription body sourceName sourceUrl sourceUpdatedAt completed
      quizItems { id question options explanation }
    }
  }
}`;
const FINANCE_NEWS_FEED_Q = `query FinanceNewsFeed($limit: Int, $importantOnly: Boolean) {
  financeNewsFeed(limit: $limit, importantOnly: $importantOnly) {
    id title summaryShort sourceName sourceUrl publishedAt isImportant importanceScore
  }
}`;
const FINANCE_NEWS_ITEM_Q = `query FinanceNewsItem($id: ID!) {
  financeNewsItem(id: $id) {
    id title summaryShort sourceName sourceUrl publishedAt isImportant importanceScore
  }
}`;

// ─────────────────────────────────────────────────────────────
// Hooks — TanStack Query
// ─────────────────────────────────────────────────────────────

export const useMe = () =>
  useQuery({
    queryKey: ['me'],
    queryFn: () => gqlFetcher<{ me: Me | null }, undefined>(ME_Q),
    staleTime: 5 * 60_000,
  });

export const useDashboard = () =>
  useQuery({
    queryKey: ['dashboard'],
    queryFn: () => gqlFetcher<{ dashboard: DashboardStats }, undefined>(DASHBOARD_Q),
    staleTime: 30_000,
  });

export const useCategoryBreakdown = (period: Period = 'LAST_30D') =>
  useQuery({
    queryKey: ['categoryBreakdown', period],
    queryFn: () =>
      gqlFetcher<{ categoryBreakdown: CategoryBreakdownRow[] }, { period: Period }>(
        CATEGORY_BREAKDOWN_Q,
        { period },
      ),
    staleTime: 60_000,
  });

export const useTransactions = (period: Period = 'LAST_90D', take = 50) =>
  useQuery({
    queryKey: ['transactions', period, take],
    queryFn: () =>
      gqlFetcher<{ transactions: Transaction[] }, { period: Period; take: number }>(
        TRANSACTIONS_Q,
        { period, take },
      ),
    staleTime: 30_000,
  });

export const useSubscriptions = () =>
  useQuery({
    queryKey: ['subscriptions'],
    queryFn: () => gqlFetcher<{ subscriptions: Subscription[] }, undefined>(SUBSCRIPTIONS_Q),
    staleTime: 60_000,
  });

export const useSubscriptionSummary = () =>
  useQuery({
    queryKey: ['subscriptionSummary'],
    queryFn: () =>
      gqlFetcher<{ subscriptionSummary: SubscriptionSummaryData }, undefined>(
        SUBSCRIPTION_SUMMARY_Q,
      ),
    staleTime: 30_000,
  });

export const useGoals = () =>
  useQuery({
    queryKey: ['goals'],
    queryFn: () => gqlFetcher<{ goals: Goal[] }, undefined>(GOALS_Q),
    staleTime: 30_000,
  });

export const useGoal = (id: string) =>
  useQuery({
    queryKey: ['goal', id],
    queryFn: () => gqlFetcher<{ goal: Goal | null }, { id: string }>(GOAL_Q, { id }),
    staleTime: 30_000,
    enabled: !!id,
  });

export const useGoalPriceAlerts = (unreadOnly = false) =>
  useQuery({
    queryKey: ['goalPriceAlerts', unreadOnly],
    queryFn: () =>
      gqlFetcher<{ goalPriceAlerts: GoalPriceAlert[] }, { unreadOnly: boolean }>(
        GOAL_PRICE_ALERTS_Q,
        {
          unreadOnly,
        },
      ),
    staleTime: 30_000,
  });

export const useFundRecommendations = (input: {
  riskProfile: RiskProfile;
  targetYears?: number;
  goalId?: string;
  enabled?: boolean;
}) =>
  useQuery({
    queryKey: ['fundRecommendations', input.riskProfile, input.targetYears, input.goalId],
    queryFn: () =>
      gqlFetcher<
        { fundRecommendations: FundRecommendation[] },
        { input: { riskProfile: RiskProfile; targetYears?: number; goalId?: string } }
      >(FUND_RECOMMENDATIONS_Q, {
        input: {
          riskProfile: input.riskProfile,
          ...(input.targetYears !== undefined ? { targetYears: input.targetYears } : {}),
          ...(input.goalId ? { goalId: input.goalId } : {}),
        },
      }),
    staleTime: 60_000,
    enabled: input.enabled ?? true,
  });

export const useLatestInflationRate = () =>
  useQuery({
    queryKey: ['latestInflationRate'],
    queryFn: () =>
      gqlFetcher<{ latestInflationRate: InflationRate | null }, undefined>(LATEST_INFLATION_RATE_Q),
    staleTime: 12 * 60 * 60 * 1000,
  });

export const useFutureScore = () =>
  useQuery({
    queryKey: ['futureScore'],
    queryFn: () => gqlFetcher<{ futureScore: FutureScore | null }, undefined>(FUTURE_SCORE_Q),
    staleTime: 60_000,
  });

export const useFutureScoreInsights = () =>
  useQuery({
    queryKey: ['futureScoreInsights'],
    queryFn: () =>
      gqlFetcher<{ futureScoreInsights: FutureScoreInsights }, undefined>(FUTURE_SCORE_INSIGHTS_Q),
    staleTime: 60_000,
  });

export const useNotifications = (unreadOnly = false) =>
  useQuery({
    queryKey: ['notifications', unreadOnly],
    queryFn: () =>
      gqlFetcher<{ notifications: NotificationItem[] }, { unreadOnly: boolean }>(NOTIFICATIONS_Q, {
        unreadOnly,
      }),
    staleTime: 15_000,
  });

export const useAnalysisHistory = (limit = 10) =>
  useQuery({
    queryKey: ['analysisHistory', limit],
    queryFn: () =>
      gqlFetcher<{ analysisHistory: AnalysisRunItem[] }, { limit: number }>(ANALYSIS_HISTORY_Q, {
        limit,
      }),
    staleTime: 30_000,
  });

export const useAnalysisRun = (id: string) =>
  useQuery({
    queryKey: ['analysisRun', id],
    queryFn: () =>
      gqlFetcher<{ analysisRun: AnalysisRunDetail | null }, { id: string }>(ANALYSIS_RUN_Q, {
        id,
      }),
    staleTime: 60_000,
    enabled: !!id,
  });

// useCircles — dosya sonundaki savings circles PBI bölümünde.

export const useLearnHome = (date?: string | null) =>
  useQuery({
    queryKey: ['learnHome', date ?? null],
    queryFn: () =>
      gqlFetcher<{ learnHome: LearnHome | null }, { date?: string | null }>(LEARN_HOME_Q, {
        date: date ?? null,
      }),
    staleTime: 60_000,
  });

export const useLearnCard = (id: string) =>
  useQuery({
    queryKey: ['learnCard', id],
    queryFn: () =>
      gqlFetcher<{ learnCard: LearnCard | null }, { id: string }>(LEARN_CARD_Q, { id }),
    staleTime: 60_000,
    enabled: !!id,
  });

export const useLearnHistory = (limit = 10) =>
  useQuery({
    queryKey: ['learnHistory', limit],
    queryFn: () =>
      gqlFetcher<{ learnHistory: LearnHome[] }, { limit: number }>(LEARN_HISTORY_Q, { limit }),
    staleTime: 60_000,
  });

export const useFinanceNewsFeed = (limit = 20, importantOnly = false) =>
  useQuery({
    queryKey: ['financeNewsFeed', limit, importantOnly],
    queryFn: () =>
      gqlFetcher<{ financeNewsFeed: FinanceNewsItem[] }, { limit: number; importantOnly: boolean }>(
        FINANCE_NEWS_FEED_Q,
        { limit, importantOnly },
      ),
    staleTime: 60_000,
  });

export const useFinanceNewsItem = (id: string) =>
  useQuery({
    queryKey: ['financeNewsItem', id],
    queryFn: () =>
      gqlFetcher<{ financeNewsItem: FinanceNewsItem | null }, { id: string }>(FINANCE_NEWS_ITEM_Q, {
        id,
      }),
    staleTime: 60_000,
    enabled: !!id,
  });

export const useMicroContributions = (
  options: {
    limit?: number;
    statusFilter?: ContributionStatus;
    categoryFilter?: SpendingCategory;
  } = {},
) =>
  useQuery({
    queryKey: ['microContributions', options],
    queryFn: () =>
      gqlFetcher<
        { microContributions: MicroContribution[] },
        { limit: number; statusFilter?: ContributionStatus; categoryFilter?: SpendingCategory }
      >(MICRO_CONTRIBUTIONS_Q, {
        limit: options.limit ?? 50,
        statusFilter: options.statusFilter,
        categoryFilter: options.categoryFilter,
      }),
    staleTime: 30_000,
  });

export const useContributionSummary = () =>
  useQuery({
    queryKey: ['contributionSummary'],
    queryFn: () =>
      gqlFetcher<{ contributionSummary: ContributionSummary }, undefined>(CONTRIBUTION_SUMMARY_Q),
    staleTime: 30_000,
  });

// ─────────────────────────────────────────────────────────────
// Mutations
// ─────────────────────────────────────────────────────────────

const EDIT_TRANSACTION_CATEGORY_M = `mutation EditTxCategory($id: ID!, $category: SpendingCategory!) {
  editTransactionCategory(id: $id, category: $category) {
    id category categoryEdited
  }
}`;

const CREATE_GOAL_M = `mutation CreateGoal($input: GoalInput!) {
  createGoal(input: $input) {
    id name basePrice currentPrice targetDate current monthlyContribution status planSummary planGeneratedAt
  }
}`;

const UPDATE_GOAL_M = `mutation UpdateGoal($id: ID!, $input: GoalUpdateInput!) {
  updateGoal(id: $id, input: $input) {
    id name monthlyContribution inflationPct autoUpdate coachContext
  }
}`;
const NORMALIZE_GOAL_QUERY_M = `mutation NormalizeGoalProductQuery($rawQuery: String!) {
  normalizeGoalProductQuery(rawQuery: $rawQuery) {
    rawQuery normalizedQuery category confidence source
  }
}`;
const SEARCH_GOAL_PRODUCTS_M = `mutation SearchGoalProducts($query: String!) {
  searchGoalProducts(query: $query) {
    title url image source price currency
  }
}`;
const REFRESH_GOAL_TRACKED_PRICE_M = `mutation RefreshGoalTrackedPrice($goalId: ID!) {
  refreshGoalTrackedPrice(goalId: $goalId) {
    message
    goal {
      id currentPrice currency lastCheckedAt productSource productImage
      trackedProgress trackedRemainingAmount
    }
    alert {
      id goalId oldPrice newPrice percentageChange direction
      remainingAmountImpact monthlySavingNeeded readAt createdAt
    }
  }
}`;
const MARK_GOAL_ALERT_READ_M = `mutation MarkGoalPriceAlertRead($alertId: ID!) {
  markGoalPriceAlertRead(alertId: $alertId) { id readAt }
}`;

const RUN_ANALYSIS_M = `mutation RunAnalysis($forceRefresh: Boolean) {
  runAnalysis(forceRefresh: $forceRefresh) {
    id triggeredAt geminiModel durationMs totalTransactions totalOpportunity error
  }
}`;

const MARK_NOTIFICATION_READ_M = `mutation MarkNotificationRead($id: ID!) {
  markNotificationRead(id: $id) { id read }
}`;
const COMPLETE_LEARN_CARD_M = `mutation CompleteLearnCard($cardId: ID!, $quizAnswers: [Int!]!) {
  completeLearnCard(cardId: $cardId, quizAnswers: $quizAnswers) {
    xpEarned quizScore
    state { totalXp level streakDays lastActiveDate }
  }
}`;

export function useEditTransactionCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, category }: { id: string; category: SpendingCategory }) =>
      gqlFetcher<
        { editTransactionCategory: Pick<Transaction, 'id' | 'category' | 'categoryEdited'> },
        { id: string; category: SpendingCategory }
      >(EDIT_TRANSACTION_CATEGORY_M, { id, category }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['transactions'] });
      void qc.invalidateQueries({ queryKey: ['categoryBreakdown'] });
      void qc.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Kategori güncellendi');
    },
    onError: () => toast.error('Kategori güncellenemedi'),
  });
}

export interface GoalInput {
  name: string;
  basePrice: number;
  targetDate: string;
  inflationPct?: number;
  monthlyContribution?: number;
  tracking?: {
    rawQuery: string;
    normalizedQuery: string;
    category?: string | null;
    selectedProductTitle: string;
    productUrl: string;
    productImage?: string | null;
    productSource: string;
    price: number;
    currency?: string;
  };
}

export function useCreateGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: GoalInput) =>
      gqlFetcher<{ createGoal: Goal }, { input: GoalInput }>(CREATE_GOAL_M, { input }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['goals'] });
      void qc.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Hedef oluşturuldu');
    },
  });
}

export interface GoalUpdateInput {
  name?: string;
  monthlyContribution?: number;
  inflationPct?: number;
  autoUpdate?: boolean;
  coachContext?: string;
}

export function useUpdateGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: GoalUpdateInput }) =>
      gqlFetcher<{ updateGoal: Goal }, { id: string; input: GoalUpdateInput }>(UPDATE_GOAL_M, {
        id,
        input,
      }),
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({ queryKey: ['goals'] });
      void qc.invalidateQueries({ queryKey: ['goal', vars.id] });
    },
  });
}

export function useNormalizeGoalProductQuery() {
  return useMutation({
    mutationFn: (rawQuery: string) =>
      gqlFetcher<{ normalizeGoalProductQuery: ProductQueryNormalization }, { rawQuery: string }>(
        NORMALIZE_GOAL_QUERY_M,
        { rawQuery },
      ),
  });
}

export function useSearchGoalProducts() {
  return useMutation({
    mutationFn: (query: string) =>
      gqlFetcher<{ searchGoalProducts: ProductSearchResult[] }, { query: string }>(
        SEARCH_GOAL_PRODUCTS_M,
        {
          query,
        },
      ),
  });
}

export function useRefreshGoalTrackedPrice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (goalId: string) =>
      gqlFetcher<{ refreshGoalTrackedPrice: GoalPriceRefreshResult }, { goalId: string }>(
        REFRESH_GOAL_TRACKED_PRICE_M,
        { goalId },
      ),
    onSuccess: (data) => {
      const goalId = data.refreshGoalTrackedPrice.goal.id;
      void qc.invalidateQueries({ queryKey: ['goal', goalId] });
      void qc.invalidateQueries({ queryKey: ['goals'] });
      void qc.invalidateQueries({ queryKey: ['goalPriceAlerts'] });
      if (data.refreshGoalTrackedPrice.message) {
        toast.message(data.refreshGoalTrackedPrice.message);
      } else {
        toast.success('Ürün fiyatı güncellendi');
      }
    },
    onError: (e: Error) => toast.error('Fiyat yenilenemedi', { description: e.message }),
  });
}

export function useMarkGoalPriceAlertRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (alertId: string) =>
      gqlFetcher<
        { markGoalPriceAlertRead: { id: string; readAt: string | null } },
        { alertId: string }
      >(MARK_GOAL_ALERT_READ_M, { alertId }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['goalPriceAlerts'] });
    },
  });
}

export function useRunAnalysis() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (forceRefresh: boolean) =>
      gqlFetcher<{ runAnalysis: AnalysisRunItem }, { forceRefresh: boolean }>(RUN_ANALYSIS_M, {
        forceRefresh,
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['analysisHistory'] });
      void qc.invalidateQueries({ queryKey: ['dashboard'] });
      void qc.invalidateQueries({ queryKey: ['categoryBreakdown'] });
      void qc.invalidateQueries({ queryKey: ['transactions'] });
    },
    onError: () => toast.error('Analiz tetiklenemedi'),
  });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      gqlFetcher<{ markNotificationRead: { id: string; read: boolean } }, { id: string }>(
        MARK_NOTIFICATION_READ_M,
        { id },
      ),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useCompleteLearnCard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ cardId, quizAnswers }: { cardId: string; quizAnswers: number[] }) =>
      gqlFetcher<
        {
          completeLearnCard: {
            xpEarned: number;
            quizScore: number;
            state: LearnUserState;
          };
        },
        { cardId: string; quizAnswers: number[] }
      >(COMPLETE_LEARN_CARD_M, { cardId, quizAnswers }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['learnHome'] });
      void qc.invalidateQueries({ queryKey: ['learnHistory'] });
      void qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

/** Tüm contribution-related query'leri yenile (tek yerden DRY) */
function invalidateContributionQueries(qc: ReturnType<typeof useQueryClient>) {
  void qc.invalidateQueries({ queryKey: ['microContributions'] });
  void qc.invalidateQueries({ queryKey: ['contributionSummary'] });
  void qc.invalidateQueries({ queryKey: ['transactions'] });
  void qc.invalidateQueries({ queryKey: ['categoryBreakdown'] });
  void qc.invalidateQueries({ queryKey: ['dashboard'] });
}

export function useAcceptTransactionContribution() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: {
      transactionId: string;
      amount?: number;
      goalId?: string;
      note?: string;
    }) =>
      gqlFetcher<
        { acceptTransactionContribution: MicroContribution },
        { transactionId: string; amount?: number; goalId?: string; note?: string }
      >(ACCEPT_TX_CONTRIB_M, vars),
    onSuccess: (data) => {
      invalidateContributionQueries(qc);
      toast.success(
        `+${Math.round(data.acceptTransactionContribution.amount)} ₺ katkıya dönüştürüldü`,
      );
    },
    onError: (e: Error) => toast.error('Katkıya dönüştürülemedi', { description: e.message }),
  });
}

export function useAcceptCategoryContribution() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { category: SpendingCategory; goalId?: string }) =>
      gqlFetcher<
        { acceptCategoryContribution: MicroContribution },
        { category: SpendingCategory; goalId?: string }
      >(ACCEPT_CATEGORY_CONTRIB_M, vars),
    onSuccess: (data) => {
      invalidateContributionQueries(qc);
      toast.success(
        `+${Math.round(data.acceptCategoryContribution.amount)} ₺ toplu katkıya dönüştürüldü`,
      );
    },
    onError: (e: Error) => toast.error('Toplu katkı yapılamadı', { description: e.message }),
  });
}

export function useReverseContribution() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      gqlFetcher<
        { reverseContribution: { id: string; status: ContributionStatus } },
        { id: string }
      >(REVERSE_CONTRIB_M, { id }),
    onSuccess: () => {
      invalidateContributionQueries(qc);
      toast.success('Katkı geri alındı');
    },
    onError: () => toast.error('Geri alınamadı'),
  });
}

function invalidateSubscriptionQueries(qc: ReturnType<typeof useQueryClient>) {
  void qc.invalidateQueries({ queryKey: ['subscriptions'] });
  void qc.invalidateQueries({ queryKey: ['subscriptionSummary'] });
}

export function useMarkSubscriptionStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; status: SubscriptionStatus }) =>
      gqlFetcher<
        { markSubscriptionStatus: { id: string; status: SubscriptionStatus } },
        { id: string; status: SubscriptionStatus }
      >(MARK_SUB_STATUS_M, vars),
    onSuccess: (_data, vars) => {
      invalidateSubscriptionQueries(qc);
      toast.success(
        vars.status === 'CANCELLABLE'
          ? 'İptal edilebilir işaretlendi'
          : 'Kullanılıyor olarak işaretlendi',
      );
    },
    onError: (e: Error) => toast.error('İşaretlenemedi', { description: e.message }),
  });
}

export function useCancelSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; contributionAmount?: number }) =>
      gqlFetcher<
        {
          cancelSubscription: {
            id: string;
            name: string;
            status: SubscriptionStatus;
            yearlyAmount: number;
          };
        },
        { id: string; contributionAmount?: number }
      >(CANCEL_SUB_M, vars),
    onSuccess: (data) => {
      invalidateSubscriptionQueries(qc);
      invalidateContributionQueries(qc);
      toast.success(
        `${data.cancelSubscription.name} iptal edildi · ${Math.round(data.cancelSubscription.yearlyAmount)} ₺ yıllık tasarruf`,
      );
    },
    onError: (e: Error) => toast.error('İptal edilemedi', { description: e.message }),
  });
}

// ─────────────────────────────────────────────────────────────
// AI Saving Coach (Pattern B) hooks
// ─────────────────────────────────────────────────────────────

export const useChatSessions = (limit = 20) =>
  useQuery({
    queryKey: ['chatSessions', limit],
    queryFn: () =>
      gqlFetcher<{ chatSessions: ChatSession[] }, { limit: number }>(CHAT_SESSIONS_Q, { limit }),
    staleTime: 30_000,
  });

export const useChatSession = (id: string | null) =>
  useQuery({
    queryKey: ['chatSession', id],
    queryFn: () =>
      gqlFetcher<{ chatSession: ChatSession | null }, { id: string }>(CHAT_SESSION_Q, {
        id: id!,
      }),
    staleTime: 5_000,
    enabled: !!id,
  });

export function useSendChatMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: {
      message: string;
      sessionId?: string;
      goalContext?: string;
      goalId?: string;
    }) =>
      gqlFetcher<
        { sendChatMessage: SendMessageResponse },
        { message: string; sessionId?: string; goalContext?: string; goalId?: string }
      >(SEND_CHAT_M, vars),
    onSuccess: (data) => {
      void qc.invalidateQueries({ queryKey: ['chatSession', data.sendChatMessage.sessionId] });
      void qc.invalidateQueries({ queryKey: ['chatSessions'] });
    },
    onError: (e: Error) => toast.error('Mesaj gönderilemedi', { description: e.message }),
  });
}

export function useDeleteChatSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      gqlFetcher<{ deleteChatSession: boolean }, { id: string }>(DELETE_CHAT_M, { id }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['chatSessions'] });
      toast.success('Sohbet silindi');
    },
  });
}

// ───────────────────────────────────────────────────────────
// Rules (auto-contribution) — eklenmek istenen: payday katkı kuralı
// ───────────────────────────────────────────────────────────

export type RuleFrequency = 'WEEKLY' | 'MONTHLY' | 'PAYDAY' | 'ONE_TIME';

export interface Rule {
  id: string;
  label: string;
  amount: number;
  frequency: RuleFrequency;
  active: boolean;
  createdAt: string;
}

export interface RuleTriggerResult {
  ruleId: string;
  userId: string;
  amount: number;
  microContributionId: string;
  notificationId: string;
}

export interface CreateRuleInput {
  label: string;
  amount: number;
  frequency: RuleFrequency;
  payday?: number | null;
}

export interface UpdateRuleInput {
  label?: string;
  amount?: number;
  active?: boolean;
}

const RULES_Q = `query Rules {
  rules { id label amount frequency active createdAt }
}`;

const CREATE_RULE_M = `mutation CreateRule($input: CreateRuleInput!) {
  createRule(input: $input) { id label amount frequency active createdAt }
}`;

const UPDATE_RULE_M = `mutation UpdateRule($ruleId: ID!, $input: UpdateRuleInput!) {
  updateRule(ruleId: $ruleId, input: $input) { id label amount frequency active createdAt }
}`;

const DELETE_RULE_M = `mutation DeleteRule($ruleId: ID!) {
  deleteRule(ruleId: $ruleId)
}`;

const TRIGGER_RULE_M = `mutation TriggerRule($ruleId: ID!) {
  triggerRule(ruleId: $ruleId) {
    ruleId userId amount microContributionId notificationId
  }
}`;

export function useRules() {
  return useQuery({
    queryKey: ['rules'],
    queryFn: () => gqlFetcher<{ rules: Rule[] }, undefined>(RULES_Q),
    select: (data) => data.rules,
  });
}

export function useCreateRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateRuleInput) =>
      gqlFetcher<{ createRule: Rule }, { input: CreateRuleInput }>(CREATE_RULE_M, { input }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['rules'] });
      void qc.invalidateQueries({ queryKey: ['me'] });
      toast.success('Katkı kuralı oluşturuldu');
    },
    onError: (e: Error) => toast.error('Kural oluşturulamadı', { description: e.message }),
  });
}

export function useUpdateRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { ruleId: string; input: UpdateRuleInput }) =>
      gqlFetcher<{ updateRule: Rule }, { ruleId: string; input: UpdateRuleInput }>(
        UPDATE_RULE_M,
        vars,
      ),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['rules'] });
    },
    onError: (e: Error) => toast.error('Kural güncellenemedi', { description: e.message }),
  });
}

export function useDeleteRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ruleId: string) =>
      gqlFetcher<{ deleteRule: boolean }, { ruleId: string }>(DELETE_RULE_M, { ruleId }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['rules'] });
      toast.success('Kural silindi');
    },
    onError: (e: Error) => toast.error('Kural silinemedi', { description: e.message }),
  });
}

export function useTriggerRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ruleId: string) =>
      gqlFetcher<{ triggerRule: RuleTriggerResult }, { ruleId: string }>(TRIGGER_RULE_M, {
        ruleId,
      }),
    onSuccess: (data) => {
      void qc.invalidateQueries({ queryKey: ['dashboard'] });
      void qc.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('Otomatik katkı eklendi', {
        description: `${data.triggerRule.amount.toLocaleString('tr-TR')} ₺ emeklilik katkına eklendi.`,
      });
    },
    onError: (e: Error) => toast.error('Kural tetiklenemedi', { description: e.message }),
  });
}

// ───────────────────────────────────────────────────────────
// Savings Projection — PBI: bugünkü tasarrufun aylık/yıllık/uzun vadeli etkisi
// ───────────────────────────────────────────────────────────

export interface SavingsHorizonPoint {
  years: number;
  totalAmount: number;
  totalContributed: number;
  growth: number;
}

export interface SavingsProjection {
  todayAmount: number;
  monthlyAmount: number;
  yearlyAmount: number;
  horizon: SavingsHorizonPoint[];
  annualReturnPct: number;
  isEstimated: boolean;
}

const SAVINGS_PROJECTION_Q = `query SavingsProjection($annualReturnPct: Float) {
  savingsProjection(annualReturnPct: $annualReturnPct) {
    todayAmount
    monthlyAmount
    yearlyAmount
    annualReturnPct
    isEstimated
    horizon { years totalAmount totalContributed growth }
  }
}`;

export function useSavingsProjection(annualReturnPct?: number) {
  return useQuery({
    queryKey: ['savingsProjection', annualReturnPct ?? 5],
    queryFn: () =>
      gqlFetcher<{ savingsProjection: SavingsProjection }, { annualReturnPct?: number }>(
        SAVINGS_PROJECTION_Q,
        { annualReturnPct },
      ),
    select: (data) => data.savingsProjection,
  });
}

// ───────────────────────────────────────────────────────────
// Pause (Nefes Ayı) — PBI: geçici katkı duraklatma
// ───────────────────────────────────────────────────────────

const PAUSE_M = `mutation PauseContributions($months: Int!) {
  pauseContributions(months: $months) {
    id pausedUntil
    pauseStatus { isPaused pausedUntil remainingDays summary }
  }
}`;

const RESUME_M = `mutation ResumeContributions {
  resumeContributions {
    id pausedUntil
    pauseStatus { isPaused pausedUntil remainingDays summary }
  }
}`;

export function usePauseContributions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (months: number) =>
      gqlFetcher<
        {
          pauseContributions: { id: string; pausedUntil: string | null; pauseStatus: PauseStatus };
        },
        { months: number }
      >(PAUSE_M, { months }),
    onSuccess: (data) => {
      void qc.invalidateQueries({ queryKey: ['me'] });
      const status = data.pauseContributions.pauseStatus;
      toast.success('Nefes Ayı başlatıldı', {
        description: status.summary,
      });
    },
    onError: (e: Error) => toast.error('Duraklatma başarısız', { description: e.message }),
  });
}

export function useResumeContributions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      gqlFetcher<{ resumeContributions: { id: string; pausedUntil: string | null } }, undefined>(
        RESUME_M,
      ),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['me'] });
      toast.success('Katkılar sürdürüldü');
    },
    onError: (e: Error) => toast.error('Sürdürme başarısız', { description: e.message }),
  });
}

// ─────────────────────────────────────────────────────────────
// Category Auto-Save — PBI: ortalama-altı kategori farkını otomatik aktar
// ─────────────────────────────────────────────────────────────

export interface CategoryAutoSaveRule {
  id: string;
  category: SpendingCategory;
  lookbackMonths: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  lastTriggeredAt: string | null;
  lastTriggeredMonth: string | null;
  lastTransferAmount: number | null;
}

export interface CategoryAutoSaveLookbackMonth {
  monthYear: string;
  amount: number;
  txCount: number;
}

export interface CategoryAutoSaveShortfall {
  monthYear: string;
  currentAmount: number;
  averageAmount: number | null;
  lookback: CategoryAutoSaveLookbackMonth[];
  lookbackMonthsAnalyzed: number;
  hasSufficientHistory: boolean;
  shortfallAmount: number;
  shortfallPct: number | null;
  shouldTrigger: boolean;
}

export type CategoryAutoSaveOutcomeStatus =
  | 'TRIGGERED'
  | 'SKIPPED_ALREADY_TRIGGERED'
  | 'SKIPPED_INSUFFICIENT_HISTORY'
  | 'SKIPPED_NO_SHORTFALL';

export interface CategoryAutoSaveOutcome {
  ruleId: string;
  monthYear: string;
  category: SpendingCategory;
  status: CategoryAutoSaveOutcomeStatus;
  shortfall: CategoryAutoSaveShortfall;
  microContributionId: string | null;
}

const CATEGORY_AUTO_SAVE_RULES_Q = `query CategoryAutoSaveRules {
  categoryAutoSaveRules {
    id category lookbackMonths active createdAt updatedAt
    lastTriggeredAt lastTriggeredMonth lastTransferAmount
  }
}`;

const PREVIEW_CATEGORY_AUTO_SAVE_Q = `query PreviewCategoryAutoSave($category: SpendingCategory!, $lookbackMonths: Int, $monthYear: String) {
  previewCategoryAutoSave(category: $category, lookbackMonths: $lookbackMonths, monthYear: $monthYear) {
    monthYear currentAmount averageAmount
    lookback { monthYear amount txCount }
    lookbackMonthsAnalyzed hasSufficientHistory
    shortfallAmount shortfallPct shouldTrigger
  }
}`;

const CREATE_CATEGORY_AUTO_SAVE_M = `mutation CreateCategoryAutoSaveRule($category: SpendingCategory!, $lookbackMonths: Int) {
  createCategoryAutoSaveRule(category: $category, lookbackMonths: $lookbackMonths) {
    id category lookbackMonths active createdAt
  }
}`;

const DELETE_CATEGORY_AUTO_SAVE_M = `mutation DeleteCategoryAutoSaveRule($id: ID!) {
  deleteCategoryAutoSaveRule(id: $id)
}`;

const SET_CATEGORY_AUTO_SAVE_ACTIVE_M = `mutation SetCategoryAutoSaveRuleActive($id: ID!, $active: Boolean!) {
  setCategoryAutoSaveRuleActive(id: $id, active: $active) {
    id active
  }
}`;

const TRIGGER_CATEGORY_AUTO_SAVE_M = `mutation TriggerCategoryAutoSaveRule($id: ID!, $monthYear: String) {
  triggerCategoryAutoSaveRule(id: $id, monthYear: $monthYear) {
    ruleId monthYear category status
    microContributionId
    shortfall {
      currentAmount averageAmount shortfallAmount shortfallPct
      hasSufficientHistory shouldTrigger lookbackMonthsAnalyzed
      lookback { monthYear amount txCount }
    }
  }
}`;

const RUN_CATEGORY_AUTO_SAVE_FOR_ME_M = `mutation RunCategoryAutoSaveForMe($monthYear: String) {
  runCategoryAutoSaveForMe(monthYear: $monthYear) {
    ruleId monthYear category status
    microContributionId
    shortfall {
      currentAmount averageAmount shortfallAmount shortfallPct
      hasSufficientHistory shouldTrigger lookbackMonthsAnalyzed
      lookback { monthYear amount txCount }
    }
  }
}`;

export function useCategoryAutoSaveRules() {
  return useQuery({
    queryKey: ['category-auto-save-rules'],
    queryFn: () =>
      gqlFetcher<{ categoryAutoSaveRules: CategoryAutoSaveRule[] }, undefined>(
        CATEGORY_AUTO_SAVE_RULES_Q,
      ),
    select: (d) => d.categoryAutoSaveRules,
  });
}

export function usePreviewCategoryAutoSave(args: {
  category: SpendingCategory | null;
  lookbackMonths?: number;
  monthYear?: string;
}) {
  return useQuery({
    queryKey: [
      'preview-category-auto-save',
      args.category,
      args.lookbackMonths ?? 3,
      args.monthYear ?? null,
    ],
    enabled: Boolean(args.category),
    queryFn: () =>
      gqlFetcher<
        { previewCategoryAutoSave: CategoryAutoSaveShortfall },
        { category: SpendingCategory; lookbackMonths?: number; monthYear?: string }
      >(PREVIEW_CATEGORY_AUTO_SAVE_Q, {
        category: args.category as SpendingCategory,
        lookbackMonths: args.lookbackMonths ?? 3,
        monthYear: args.monthYear,
      }),
    select: (d) => d.previewCategoryAutoSave,
  });
}

export function useCreateCategoryAutoSaveRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { category: SpendingCategory; lookbackMonths?: number }) =>
      gqlFetcher<
        { createCategoryAutoSaveRule: CategoryAutoSaveRule },
        { category: SpendingCategory; lookbackMonths?: number }
      >(CREATE_CATEGORY_AUTO_SAVE_M, vars),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['category-auto-save-rules'] });
      toast.success('Otomatik fark kuralı oluşturuldu');
    },
    onError: (e: Error) => toast.error('Kural oluşturulamadı', { description: e.message }),
  });
}

export function useDeleteCategoryAutoSaveRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      gqlFetcher<{ deleteCategoryAutoSaveRule: boolean }, { id: string }>(
        DELETE_CATEGORY_AUTO_SAVE_M,
        { id },
      ),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['category-auto-save-rules'] });
      toast.success('Kural silindi');
    },
    onError: (e: Error) => toast.error('Silinemedi', { description: e.message }),
  });
}

export function useSetCategoryAutoSaveRuleActive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; active: boolean }) =>
      gqlFetcher<
        { setCategoryAutoSaveRuleActive: { id: string; active: boolean } },
        { id: string; active: boolean }
      >(SET_CATEGORY_AUTO_SAVE_ACTIVE_M, vars),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['category-auto-save-rules'] });
    },
    onError: (e: Error) => toast.error('Güncellenemedi', { description: e.message }),
  });
}

export function useTriggerCategoryAutoSaveRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; monthYear?: string }) =>
      gqlFetcher<
        { triggerCategoryAutoSaveRule: CategoryAutoSaveOutcome },
        { id: string; monthYear?: string }
      >(TRIGGER_CATEGORY_AUTO_SAVE_M, vars),
    onSuccess: (data) => {
      void qc.invalidateQueries({ queryKey: ['category-auto-save-rules'] });
      void qc.invalidateQueries({ queryKey: ['dashboard'] });
      void qc.invalidateQueries({ queryKey: ['contribution-summary'] });
      const o = data.triggerCategoryAutoSaveRule;
      if (o.status === 'TRIGGERED') {
        toast.success('Fark katkıya aktarıldı', {
          description: `${o.shortfall.shortfallAmount.toLocaleString('tr-TR')} ₺ emeklilik katkına eklendi.`,
        });
      } else if (o.status === 'SKIPPED_ALREADY_TRIGGERED') {
        toast.info('Bu ay zaten tetiklenmiş');
      } else if (o.status === 'SKIPPED_INSUFFICIENT_HISTORY') {
        toast.info('Yeterli geçmiş veri yok', {
          description: 'Bu kategori için önceki aylarda işlem bulunamadı.',
        });
      } else if (o.status === 'SKIPPED_NO_SHORTFALL') {
        toast.info('Bu ay ortalamanın üstünde', {
          description: 'Bu ay bu kategoride ortalamanın altında değilsin — fark üretilmedi.',
        });
      }
    },
    onError: (e: Error) => toast.error('Tetikleme başarısız', { description: e.message }),
  });
}

export function useRunCategoryAutoSaveForMe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars?: { monthYear?: string }) =>
      gqlFetcher<{ runCategoryAutoSaveForMe: CategoryAutoSaveOutcome[] }, { monthYear?: string }>(
        RUN_CATEGORY_AUTO_SAVE_FOR_ME_M,
        vars ?? {},
      ),
    onSuccess: (data) => {
      void qc.invalidateQueries({ queryKey: ['category-auto-save-rules'] });
      void qc.invalidateQueries({ queryKey: ['dashboard'] });
      void qc.invalidateQueries({ queryKey: ['contribution-summary'] });
      const triggered = data.runCategoryAutoSaveForMe.filter((o) => o.status === 'TRIGGERED');
      if (triggered.length > 0) {
        const total = triggered.reduce((s, o) => s + o.shortfall.shortfallAmount, 0);
        toast.success(`${triggered.length} kategoride fark aktarıldı`, {
          description: `Toplam ${total.toLocaleString('tr-TR')} ₺ emeklilik katkına eklendi.`,
        });
      } else {
        toast.info('Bu ay aktarılacak fark yok');
      }
    },
    onError: (e: Error) => toast.error('Çalıştırma başarısız', { description: e.message }),
  });
}

// ─────────────────────────────────────────────────────────────
// Category Spending Alert — PBI: kategoride aylık limite yaklaştığında uyarı
// ─────────────────────────────────────────────────────────────

export type CategorySpendingAlertLevel = 'BELOW' | 'WARNING' | 'OVER';

export interface CategorySpendingAlertRow {
  id: string;
  category: SpendingCategory;
  monthlyLimit: number;
  warnThresholdPct: number;
  active: boolean;
  lastAlertedMonth: string | null;
  lastAlertedLevel: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CategorySpendingEvaluation {
  category: SpendingCategory;
  monthYear: string;
  monthlyLimit: number;
  spentAmount: number;
  remainingAmount: number;
  utilizationPct: number;
  warnThresholdPct: number;
  level: CategorySpendingAlertLevel;
}

export interface CategorySpendingAlertOutcome {
  alertId: string;
  category: SpendingCategory;
  evaluation: CategorySpendingEvaluation;
  notificationCreated: boolean;
  notificationId: string | null;
  skippedReason: string | null;
}

const CATEGORY_SPENDING_ALERTS_Q = `query CategorySpendingAlerts {
  categorySpendingAlerts {
    id category monthlyLimit warnThresholdPct active
    lastAlertedMonth lastAlertedLevel createdAt updatedAt
  }
}`;

const PREVIEW_CATEGORY_SPENDING_ALERT_Q = `query PreviewCategorySpendingAlert(
  $category: SpendingCategory!, $monthlyLimit: Float!, $warnThresholdPct: Float, $monthYear: String
) {
  previewCategorySpendingAlert(
    category: $category, monthlyLimit: $monthlyLimit,
    warnThresholdPct: $warnThresholdPct, monthYear: $monthYear
  ) {
    category monthYear monthlyLimit spentAmount remainingAmount
    utilizationPct warnThresholdPct level
  }
}`;

const CREATE_CATEGORY_SPENDING_ALERT_M = `mutation CreateCategorySpendingAlert(
  $category: SpendingCategory!, $monthlyLimit: Float!, $warnThresholdPct: Float
) {
  createCategorySpendingAlert(
    category: $category, monthlyLimit: $monthlyLimit, warnThresholdPct: $warnThresholdPct
  ) {
    id category monthlyLimit warnThresholdPct active createdAt
  }
}`;

const UPDATE_CATEGORY_SPENDING_ALERT_M = `mutation UpdateCategorySpendingAlert(
  $id: ID!, $monthlyLimit: Float, $warnThresholdPct: Float, $active: Boolean
) {
  updateCategorySpendingAlert(
    id: $id, monthlyLimit: $monthlyLimit, warnThresholdPct: $warnThresholdPct, active: $active
  ) {
    id monthlyLimit warnThresholdPct active
  }
}`;

const DELETE_CATEGORY_SPENDING_ALERT_M = `mutation DeleteCategorySpendingAlert($id: ID!) {
  deleteCategorySpendingAlert(id: $id)
}`;

const EVALUATE_MY_CATEGORY_SPENDING_ALERTS_M = `mutation EvaluateMyCategorySpendingAlerts($monthYear: String) {
  evaluateMyCategorySpendingAlerts(monthYear: $monthYear) {
    alertId category notificationCreated notificationId skippedReason
    evaluation {
      category monthYear monthlyLimit spentAmount remainingAmount
      utilizationPct warnThresholdPct level
    }
  }
}`;

export function useCategorySpendingAlerts() {
  return useQuery({
    queryKey: ['category-spending-alerts'],
    queryFn: () =>
      gqlFetcher<{ categorySpendingAlerts: CategorySpendingAlertRow[] }, undefined>(
        CATEGORY_SPENDING_ALERTS_Q,
      ),
    select: (d) => d.categorySpendingAlerts,
  });
}

export function usePreviewCategorySpendingAlert(args: {
  category: SpendingCategory | null;
  monthlyLimit: number;
  warnThresholdPct?: number;
  monthYear?: string;
}) {
  return useQuery({
    queryKey: [
      'preview-category-spending-alert',
      args.category,
      args.monthlyLimit,
      args.warnThresholdPct ?? 0.8,
      args.monthYear ?? null,
    ],
    enabled: Boolean(args.category) && args.monthlyLimit > 0,
    queryFn: () =>
      gqlFetcher<
        { previewCategorySpendingAlert: CategorySpendingEvaluation },
        {
          category: SpendingCategory;
          monthlyLimit: number;
          warnThresholdPct?: number;
          monthYear?: string;
        }
      >(PREVIEW_CATEGORY_SPENDING_ALERT_Q, {
        category: args.category as SpendingCategory,
        monthlyLimit: args.monthlyLimit,
        warnThresholdPct: args.warnThresholdPct,
        monthYear: args.monthYear,
      }),
    select: (d) => d.previewCategorySpendingAlert,
  });
}

export function useCreateCategorySpendingAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: {
      category: SpendingCategory;
      monthlyLimit: number;
      warnThresholdPct?: number;
    }) =>
      gqlFetcher<
        { createCategorySpendingAlert: CategorySpendingAlertRow },
        { category: SpendingCategory; monthlyLimit: number; warnThresholdPct?: number }
      >(CREATE_CATEGORY_SPENDING_ALERT_M, vars),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['category-spending-alerts'] });
      toast.success('Limit uyarısı eklendi');
    },
    onError: (e: Error) => toast.error('Limit eklenemedi', { description: e.message }),
  });
}

export function useUpdateCategorySpendingAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: {
      id: string;
      monthlyLimit?: number;
      warnThresholdPct?: number;
      active?: boolean;
    }) =>
      gqlFetcher<{ updateCategorySpendingAlert: CategorySpendingAlertRow }, typeof vars>(
        UPDATE_CATEGORY_SPENDING_ALERT_M,
        vars,
      ),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['category-spending-alerts'] });
    },
    onError: (e: Error) => toast.error('Güncellenemedi', { description: e.message }),
  });
}

export function useDeleteCategorySpendingAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      gqlFetcher<{ deleteCategorySpendingAlert: boolean }, { id: string }>(
        DELETE_CATEGORY_SPENDING_ALERT_M,
        { id },
      ),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['category-spending-alerts'] });
      toast.success('Limit silindi');
    },
    onError: (e: Error) => toast.error('Silinemedi', { description: e.message }),
  });
}

export function useEvaluateMyCategorySpendingAlerts() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars?: { monthYear?: string }) =>
      gqlFetcher<
        { evaluateMyCategorySpendingAlerts: CategorySpendingAlertOutcome[] },
        { monthYear?: string }
      >(EVALUATE_MY_CATEGORY_SPENDING_ALERTS_M, vars ?? {}),
    onSuccess: (data) => {
      void qc.invalidateQueries({ queryKey: ['category-spending-alerts'] });
      void qc.invalidateQueries({ queryKey: ['notifications'] });
      const fired = data.evaluateMyCategorySpendingAlerts.filter((o) => o.notificationCreated);
      if (fired.length > 0) {
        const overCount = fired.filter((o) => o.evaluation.level === 'OVER').length;
        const warnCount = fired.filter((o) => o.evaluation.level === 'WARNING').length;
        const desc: string[] = [];
        if (overCount > 0) desc.push(`${overCount} kategoride limit aşıldı`);
        if (warnCount > 0) desc.push(`${warnCount} kategoride limit yaklaşıyor`);
        toast.warning('Harcama uyarısı', { description: desc.join(', ') });
      } else {
        toast.info('Tüm kategorilerin limit altında');
      }
    },
    onError: (e: Error) => toast.error('Değerlendirme başarısız', { description: e.message }),
  });
}

// ─────────────────────────────────────────────────────────────
// Monthly Contribution Target — PBI: katki hedefine yaklaşma uyarısı
// ─────────────────────────────────────────────────────────────

export type MonthlyTargetLevel = 'BEHIND' | 'NEAR' | 'REACHED';

export interface MonthlyContributionTarget {
  id: string;
  targetAmount: number;
  warnThresholdPct: number;
  active: boolean;
  lastAlertedMonth: string | null;
  lastAlertedLevel: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MonthlyContributionEvaluation {
  monthYear: string;
  targetAmount: number;
  contributedAmount: number;
  remainingAmount: number;
  utilizationPct: number;
  warnThresholdPct: number;
  level: MonthlyTargetLevel;
}

export interface MonthlyTargetOutcome {
  targetId: string | null;
  evaluation: MonthlyContributionEvaluation | null;
  notificationCreated: boolean;
  notificationId: string | null;
  skippedReason: string | null;
}

const MY_MONTHLY_TARGET_Q = `query MyMonthlyContributionTarget {
  myMonthlyContributionTarget {
    id targetAmount warnThresholdPct active
    lastAlertedMonth lastAlertedLevel createdAt updatedAt
  }
}`;

const PREVIEW_MY_MONTHLY_TARGET_Q = `query PreviewMyMonthlyContributionTarget(
  $targetAmount: Float!, $warnThresholdPct: Float, $monthYear: String
) {
  previewMyMonthlyContributionTarget(
    targetAmount: $targetAmount, warnThresholdPct: $warnThresholdPct, monthYear: $monthYear
  ) {
    monthYear targetAmount contributedAmount remainingAmount
    utilizationPct warnThresholdPct level
  }
}`;

const UPSERT_MY_MONTHLY_TARGET_M = `mutation UpsertMyMonthlyContributionTarget(
  $targetAmount: Float!, $warnThresholdPct: Float, $active: Boolean
) {
  upsertMyMonthlyContributionTarget(
    targetAmount: $targetAmount, warnThresholdPct: $warnThresholdPct, active: $active
  ) {
    id targetAmount warnThresholdPct active
  }
}`;

const DELETE_MY_MONTHLY_TARGET_M = `mutation DeleteMyMonthlyContributionTarget {
  deleteMyMonthlyContributionTarget
}`;

const EVALUATE_MY_MONTHLY_TARGET_M = `mutation EvaluateMyMonthlyContributionTarget($monthYear: String) {
  evaluateMyMonthlyContributionTarget(monthYear: $monthYear) {
    targetId notificationCreated notificationId skippedReason
    evaluation {
      monthYear targetAmount contributedAmount remainingAmount
      utilizationPct warnThresholdPct level
    }
  }
}`;

export function useMyMonthlyContributionTarget() {
  return useQuery({
    queryKey: ['my-monthly-contribution-target'],
    queryFn: () =>
      gqlFetcher<{ myMonthlyContributionTarget: MonthlyContributionTarget | null }, undefined>(
        MY_MONTHLY_TARGET_Q,
      ),
    select: (d) => d.myMonthlyContributionTarget,
  });
}

export function usePreviewMyMonthlyTarget(args: {
  targetAmount: number;
  warnThresholdPct?: number;
  monthYear?: string;
}) {
  return useQuery({
    queryKey: [
      'preview-my-monthly-target',
      args.targetAmount,
      args.warnThresholdPct ?? 0.9,
      args.monthYear ?? null,
    ],
    enabled: args.targetAmount > 0,
    queryFn: () =>
      gqlFetcher<
        { previewMyMonthlyContributionTarget: MonthlyContributionEvaluation },
        { targetAmount: number; warnThresholdPct?: number; monthYear?: string }
      >(PREVIEW_MY_MONTHLY_TARGET_Q, {
        targetAmount: args.targetAmount,
        warnThresholdPct: args.warnThresholdPct,
        monthYear: args.monthYear,
      }),
    select: (d) => d.previewMyMonthlyContributionTarget,
  });
}

export function useUpsertMyMonthlyTarget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { targetAmount: number; warnThresholdPct?: number; active?: boolean }) =>
      gqlFetcher<{ upsertMyMonthlyContributionTarget: MonthlyContributionTarget }, typeof vars>(
        UPSERT_MY_MONTHLY_TARGET_M,
        vars,
      ),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['my-monthly-contribution-target'] });
      void qc.invalidateQueries({ queryKey: ['preview-my-monthly-target'] });
      toast.success('Aylık katkı hedefi kaydedildi');
    },
    onError: (e: Error) => toast.error('Kaydedilemedi', { description: e.message }),
  });
}

export function useDeleteMyMonthlyTarget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      gqlFetcher<{ deleteMyMonthlyContributionTarget: boolean }, undefined>(
        DELETE_MY_MONTHLY_TARGET_M,
      ),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['my-monthly-contribution-target'] });
      toast.success('Aylık hedef kaldırıldı');
    },
    onError: (e: Error) => toast.error('Silinemedi', { description: e.message }),
  });
}

export function useEvaluateMyMonthlyTarget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars?: { monthYear?: string }) =>
      gqlFetcher<
        { evaluateMyMonthlyContributionTarget: MonthlyTargetOutcome },
        { monthYear?: string }
      >(EVALUATE_MY_MONTHLY_TARGET_M, vars ?? {}),
    onSuccess: (data) => {
      void qc.invalidateQueries({ queryKey: ['notifications'] });
      const o = data.evaluateMyMonthlyContributionTarget;
      if (o.skippedReason === 'NO_TARGET') {
        toast.info('Henüz aylık hedefin yok', {
          description: 'Önce bir aylık katkı hedefi belirle.',
        });
        return;
      }
      if (o.notificationCreated && o.evaluation) {
        if (o.evaluation.level === 'REACHED') {
          toast.success('🎉 Aylık hedefe ulaştın!', {
            description: `${o.evaluation.contributedAmount.toLocaleString('tr-TR')} ₺ biriktirdin (hedef ${o.evaluation.targetAmount.toLocaleString('tr-TR')} ₺).`,
          });
        } else {
          toast.success('Hedefe yaklaşıyorsun', {
            description: `${o.evaluation.contributedAmount.toLocaleString('tr-TR')} ₺ / ${o.evaluation.targetAmount.toLocaleString('tr-TR')} ₺ (%${Math.round(o.evaluation.utilizationPct * 100)}).`,
          });
        }
      } else if (o.skippedReason === 'ALREADY_ALERTED_THIS_MONTH') {
        toast.info('Bu ay zaten bilgilendirildin');
      } else {
        toast.info('Hedefe henüz uzaksın', {
          description: 'Devam et — küçük katkılar bile birikiyor.',
        });
      }
    },
    onError: (e: Error) => toast.error('Değerlendirme başarısız', { description: e.message }),
  });
}

// ─────────────────────────────────────────────────────────────
// Savings Circles — PBI: ortak birikim çemberi (aile / topluluk)
// ─────────────────────────────────────────────────────────────

export type CircleType = 'FAMILY' | 'COMMUNITY';

export interface CircleMembershipRow {
  id: string;
  contribution: number;
  role: string;
  joinedAt: string;
  user: { id: string; name: string };
}

export interface Circle {
  id: string;
  name: string;
  target: number;
  type: CircleType;
  isPublic: boolean;
  inviteCode: string | null;
  createdAt: string;
  members?: CircleMembershipRow[];
}

export interface CircleLeaderboardEntry {
  userId: string;
  name: string;
  contribution: number;
  sharePct: number;
  rank: number;
}

export interface CircleProgressData {
  target: number;
  totalContributed: number;
  remainingAmount: number;
  progressPct: number;
  highestReachedMilestone: number | null;
  nextMilestone: number | null;
  memberCount: number;
  leaderboard: CircleLeaderboardEntry[];
}

export interface CircleContributeResult {
  membershipNewContribution: number;
  microContributionId: string;
  newMilestonesReached: number[];
  notificationsCreated: number;
}

const CIRCLES_Q = `query Circles {
  circles {
    id name target type isPublic inviteCode createdAt
    members {
      id contribution role joinedAt
      user { id name }
    }
  }
}`;

const CIRCLE_Q = `query Circle($id: ID!) {
  circle(id: $id) {
    id name target type isPublic inviteCode createdAt
    members {
      id contribution role joinedAt
      user { id name }
    }
  }
}`;

const CIRCLE_PROGRESS_Q = `query CircleProgress($id: ID!) {
  circleProgress(id: $id) {
    target totalContributed remainingAmount progressPct
    highestReachedMilestone nextMilestone memberCount
    leaderboard { userId name contribution sharePct rank }
  }
}`;

const CREATE_CIRCLE_M = `mutation CreateCircle($name: String!, $target: Float!, $type: CircleType!, $isPublic: Boolean) {
  createCircle(name: $name, target: $target, type: $type, isPublic: $isPublic) {
    id name target type isPublic inviteCode createdAt
  }
}`;

const JOIN_CIRCLE_M = `mutation JoinCircleByInviteCode($code: String!) {
  joinCircleByInviteCode(code: $code) {
    id name target type isPublic inviteCode createdAt
  }
}`;

const LEAVE_CIRCLE_M = `mutation LeaveCircle($id: ID!) {
  leaveCircle(id: $id)
}`;

const CONTRIBUTE_CIRCLE_M = `mutation ContributeToCircle($circleId: ID!, $amount: Float!, $note: String) {
  contributeToCircle(circleId: $circleId, amount: $amount, note: $note) {
    membershipNewContribution microContributionId
    newMilestonesReached notificationsCreated
  }
}`;

export function useCircles() {
  return useQuery({
    queryKey: ['circles'],
    queryFn: () => gqlFetcher<{ circles: Circle[] }, undefined>(CIRCLES_Q),
    select: (d) => d.circles,
  });
}

export function useCircle(id: string | null | undefined) {
  return useQuery({
    queryKey: ['circle', id],
    enabled: Boolean(id),
    queryFn: () => gqlFetcher<{ circle: Circle | null }, { id: string }>(CIRCLE_Q, { id: id! }),
    select: (d) => d.circle,
  });
}

export function useCircleProgress(id: string | null | undefined) {
  return useQuery({
    queryKey: ['circle-progress', id],
    enabled: Boolean(id),
    queryFn: () =>
      gqlFetcher<{ circleProgress: CircleProgressData }, { id: string }>(CIRCLE_PROGRESS_Q, {
        id: id!,
      }),
    select: (d) => d.circleProgress,
  });
}

export function useCreateCircle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { name: string; target: number; type: CircleType; isPublic?: boolean }) =>
      gqlFetcher<{ createCircle: Circle }, typeof vars>(CREATE_CIRCLE_M, vars),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['circles'] });
      toast.success('Çember oluşturuldu');
    },
    onError: (e: Error) => toast.error('Çember oluşturulamadı', { description: e.message }),
  });
}

export function useJoinCircleByInviteCode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (code: string) =>
      gqlFetcher<{ joinCircleByInviteCode: Circle }, { code: string }>(JOIN_CIRCLE_M, {
        code,
      }),
    onSuccess: (data) => {
      void qc.invalidateQueries({ queryKey: ['circles'] });
      toast.success(`Çembere katıldın: ${data.joinCircleByInviteCode.name}`);
    },
    onError: (e: Error) => toast.error('Katılamadın', { description: e.message }),
  });
}

export function useLeaveCircle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      gqlFetcher<{ leaveCircle: boolean }, { id: string }>(LEAVE_CIRCLE_M, { id }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['circles'] });
      toast.success('Çemberden ayrıldın');
    },
    onError: (e: Error) => toast.error('Ayrılamadın', { description: e.message }),
  });
}

export function useContributeToCircle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { circleId: string; amount: number; note?: string }) =>
      gqlFetcher<{ contributeToCircle: CircleContributeResult }, typeof vars>(
        CONTRIBUTE_CIRCLE_M,
        vars,
      ),
    onSuccess: (data, vars) => {
      void qc.invalidateQueries({ queryKey: ['circle', vars.circleId] });
      void qc.invalidateQueries({ queryKey: ['circle-progress', vars.circleId] });
      void qc.invalidateQueries({ queryKey: ['circles'] });
      void qc.invalidateQueries({ queryKey: ['contribution-summary'] });
      void qc.invalidateQueries({ queryKey: ['dashboard'] });
      const milestones = data.contributeToCircle.newMilestonesReached;
      if (milestones.length > 0) {
        if (milestones.includes(100)) {
          toast.success('🎉 Çember hedefe ulaştı!', {
            description: `Beraber başardınız. Milestone bildirimi tüm üyelere gitti.`,
          });
        } else {
          toast.success(`Yeni milestone: %${milestones.join(', %')}`);
        }
      } else {
        toast.success('Katkı eklendi');
      }
    },
    onError: (e: Error) => toast.error('Katkı yapılamadı', { description: e.message }),
  });
}

// ─────────────────────────────────────────────────────────────
// User Impact Summary — PBI: "Niyet bana ne kattı?" ozet sayfasi
// ─────────────────────────────────────────────────────────────

export interface ImpactCategoryOpportunity {
  category: SpendingCategory;
  opportunity: number;
  monthlyTotalSpent: number;
}

export interface UserImpactSummary {
  totalContributedAllTime: number;
  contributionCount: number;
  last30dContributed: number;
  currentScore: number | null;
  scoreDelta: number;
  topDriver: {
    metric: string;
    delta: number;
    direction: 'UP' | 'DOWN' | 'FLAT';
  };
  todayOpportunity: number;
  monthlyPotential: number;
  yearlyPotential: number;
  thirtyYearProjection: number;
  topCategoryOpportunities: ImpactCategoryOpportunity[];
  activeGoalCount: number;
  circleCount: number;
}

const MY_IMPACT_SUMMARY_Q = `query MyImpactSummary {
  myImpactSummary {
    totalContributedAllTime contributionCount last30dContributed
    currentScore scoreDelta
    topDriver { metric delta direction }
    todayOpportunity monthlyPotential yearlyPotential thirtyYearProjection
    topCategoryOpportunities { category opportunity monthlyTotalSpent }
    activeGoalCount circleCount
  }
}`;

export function useMyImpactSummary() {
  return useQuery({
    queryKey: ['my-impact-summary'],
    queryFn: () =>
      gqlFetcher<{ myImpactSummary: UserImpactSummary }, undefined>(MY_IMPACT_SUMMARY_Q),
    select: (d) => d.myImpactSummary,
    staleTime: 30_000,
  });
}

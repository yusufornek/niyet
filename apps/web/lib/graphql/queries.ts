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

export interface Me {
  id: string;
  email: string;
  name: string;
  age: number;
  monthlyIncome: number;
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

export interface Circle {
  id: string;
  name: string;
  target: number;
  type: 'FAMILY' | 'COMMUNITY';
  members: Array<{
    id: string;
    contribution: number;
    user: { id: string; name: string };
  }>;
}

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

const ME_Q = `query Me { me { id email name age monthlyIncome } }`;
const DASHBOARD_Q = `query Dashboard {
  dashboard {
    totalSpentLast30d totalOpportunityLast30d txCountLast30d weeklySaved
    activeRulesCount activeGoalsCount
    totalAcceptedContributions acceptedContributionsLast30d
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
const SEND_CHAT_M = `mutation SendChatMessage($message: String!, $sessionId: ID, $goalContext: String) {
  sendChatMessage(message: $message, sessionId: $sessionId, goalContext: $goalContext) {
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
  }
}`;
const GOAL_PRICE_ALERTS_Q = `query GoalPriceAlerts($unreadOnly: Boolean) {
  goalPriceAlerts(unreadOnly: $unreadOnly) {
    id goalId oldPrice newPrice percentageChange direction
    remainingAmountImpact monthlySavingNeeded readAt createdAt
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
const CIRCLES_Q = `query Circles {
  circles {
    id name target type
    members { id contribution user { id name } }
  }
}`;
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

export const useCircles = () =>
  useQuery({
    queryKey: ['circles'],
    queryFn: () => gqlFetcher<{ circles: Circle[] }, undefined>(CIRCLES_Q),
    staleTime: 60_000,
  });

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
    mutationFn: (vars: { message: string; sessionId?: string; goalContext?: string }) =>
      gqlFetcher<
        { sendChatMessage: SendMessageResponse },
        { message: string; sessionId?: string; goalContext?: string }
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

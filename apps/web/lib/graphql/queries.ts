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

export interface FutureScore {
  id: string;
  score: number;
  contribution: number;
  discipline: number;
  consistency: number;
  social: number;
  computedAt: string;
}

export interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  read: boolean;
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
    monthlyContribution status autoUpdate
  }
}`;
const GOAL_Q = `query Goal($id: ID!) {
  goal(id: $id) {
    id name basePrice currentPrice inflationPct targetDate current
    monthlyContribution status autoUpdate priceHistory
    rawQuery normalizedQuery category selectedProductTitle productUrl
    productImage productSource currency lastCheckedAt
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
const FUND_RECOMMENDATIONS_Q = `query FundRecommendations($input: FundRecommendationInput!) {
  fundRecommendations(input: $input) {
    id name summary riskBand horizonBand expectedReturnBand whyFits score
  }
}`;
const FUTURE_SCORE_Q = `query FutureScore {
  futureScore { id score contribution discipline consistency social computedAt }
}`;
const NOTIFICATIONS_Q = `query Notifications($unreadOnly: Boolean) {
  notifications(unreadOnly: $unreadOnly) {
    id type title body read createdAt
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

export const useFutureScore = () =>
  useQuery({
    queryKey: ['futureScore'],
    queryFn: () => gqlFetcher<{ futureScore: FutureScore | null }, undefined>(FUTURE_SCORE_Q),
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
    id name basePrice currentPrice targetDate current monthlyContribution status
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

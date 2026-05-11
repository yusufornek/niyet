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
  | 'RULE_TRIGGERED';
export type Period = 'LAST_7D' | 'LAST_30D' | 'LAST_90D' | 'ALL';

export interface DashboardStats {
  totalSpentLast30d: number;
  totalOpportunityLast30d: number;
  txCountLast30d: number;
  weeklySaved: number;
  activeRulesCount: number;
  activeGoalsCount: number;
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
}

export interface Subscription {
  id: string;
  name: string;
  amount: number;
  frequency: 'WEEKLY' | 'MONTHLY' | 'PAYDAY' | 'ONE_TIME';
  status: SubscriptionStatus;
  detectedAt: string;
  merchantPattern: string | null;
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
  }
}`;
const CATEGORY_BREAKDOWN_Q = `query CategoryBreakdown($period: Period!) {
  categoryBreakdown(period: $period) { category total opportunity avg count }
}`;
const TRANSACTIONS_Q = `query Transactions($period: Period, $category: SpendingCategory, $take: Int) {
  transactions(period: $period, category: $category, take: $take) {
    id amount merchant description occurredAt category categoryEdited
    isRecurring isReducible opportunity
  }
}`;
const SUBSCRIPTIONS_Q = `query Subscriptions {
  subscriptions { id name amount frequency status detectedAt merchantPattern }
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
    checkpoints { id percent label reached reachedAt }
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

export const useCircles = () =>
  useQuery({
    queryKey: ['circles'],
    queryFn: () => gqlFetcher<{ circles: Circle[] }, undefined>(CIRCLES_Q),
    staleTime: 60_000,
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

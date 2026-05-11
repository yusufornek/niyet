/**
 * @niyet/db — Tek Prisma client instance.
 *
 * Next.js dev mode'da hot-reload her render'da yeni client yaratabilir;
 * bunu önlemek için global cache pattern kullanılır.
 */
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// NOTE: 'query' log dev'de her query'yi stdout'a yazar — Supabase pooler ile
// 200+ tx aggregate query'lerinde her satır yavaşlatır. Sadece error+warn yeterli.
// Query inspeksiyonu için `DEBUG_PRISMA_QUERIES=1` env aç.
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.DEBUG_PRISMA_QUERIES === '1' ? ['query', 'error', 'warn'] : ['error', 'warn'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Type ve enum'ları re-export et — apps/web'in @niyet/db'den import etmesi için
export {
  Prisma,
  type User,
  type Transaction,
  type Account,
  type BankConnection,
  type Subscription,
  type Goal,
  type GoalCheckpoint,
  type Rule,
  type Circle,
  type CircleMembership,
  type FutureScoreSnapshot,
  type Notification,
  type AnalysisRun,
  type TransactionAnalysis,
  type MicroContribution,
  type ChatSession,
  type ChatMessage,
  SpendingCategory,
  SubscriptionStatus,
  GoalStatus,
  RuleFrequency,
  AccountType,
  CircleType,
  NotificationType,
  ContributionSource,
  ContributionStatus,
  ChatRole,
} from '@prisma/client';

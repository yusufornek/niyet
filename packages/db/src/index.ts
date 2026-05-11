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

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
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
  SpendingCategory,
  SubscriptionStatus,
  GoalStatus,
  RuleFrequency,
  AccountType,
  CircleType,
  NotificationType,
} from '@prisma/client';

-- CreateEnum
CREATE TYPE "SpendingCategory" AS ENUM ('MARKET', 'FOOD_DELIVERY', 'COFFEE', 'DINING_OUT', 'TRANSPORT', 'FUEL', 'BILLS', 'SUBSCRIPTIONS', 'ONLINE_SHOPPING', 'CLOTHING', 'HEALTH', 'ENTERTAINMENT', 'EDUCATION', 'SPORTS', 'OTHER');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'CANCELLABLE', 'CANCELED');

-- CreateEnum
CREATE TYPE "GoalStatus" AS ENUM ('ACTIVE', 'PAUSED', 'ACHIEVED');

-- CreateEnum
CREATE TYPE "RuleFrequency" AS ENUM ('WEEKLY', 'MONTHLY', 'PAYDAY', 'ONE_TIME');

-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('CREDIT_CARD', 'DEBIT', 'CHECKING', 'SAVINGS');

-- CreateEnum
CREATE TYPE "CircleType" AS ENUM ('FAMILY', 'COMMUNITY');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('SPENDING_ALERT', 'GOAL_MILESTONE', 'AI_INSIGHT', 'ANALYSIS_COMPLETE', 'RULE_TRIGGERED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "authId" TEXT,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "age" INTEGER NOT NULL,
    "monthlyIncome" MONEY NOT NULL,
    "consentAcceptedAt" TIMESTAMP(3),
    "consentVersion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankConnection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bankName" TEXT NOT NULL,
    "connectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "disconnectedAt" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "BankConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bankConnId" TEXT NOT NULL,
    "type" "AccountType" NOT NULL,
    "last4" TEXT NOT NULL,
    "nickname" TEXT,
    "balance" MONEY NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "amount" MONEY NOT NULL,
    "merchant" TEXT NOT NULL,
    "description" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "category" "SpendingCategory" NOT NULL,
    "categoryEdited" BOOLEAN NOT NULL DEFAULT false,
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "isReducible" BOOLEAN NOT NULL DEFAULT false,
    "opportunity" MONEY,
    "rawData" JSONB,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "amount" MONEY NOT NULL,
    "frequency" "RuleFrequency" NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastChargedAt" TIMESTAMP(3),
    "merchantPattern" TEXT,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalysisRun" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "triggeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "geminiModel" TEXT NOT NULL,
    "request" JSONB NOT NULL,
    "response" JSONB NOT NULL,
    "durationMs" INTEGER NOT NULL,
    "totalTransactions" INTEGER NOT NULL,
    "totalOpportunity" MONEY NOT NULL,
    "totalTokens" INTEGER,
    "error" TEXT,

    CONSTRAINT "AnalysisRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransactionAnalysis" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "suggestedCategory" "SpendingCategory",
    "markedSubscription" BOOLEAN NOT NULL DEFAULT false,
    "reducibleAmount" MONEY,
    "reasoning" TEXT,

    CONSTRAINT "TransactionAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Goal" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "basePrice" MONEY NOT NULL,
    "currentPrice" MONEY NOT NULL,
    "inflationPct" DECIMAL(5,2) NOT NULL,
    "targetDate" TIMESTAMP(3) NOT NULL,
    "current" MONEY NOT NULL DEFAULT 0,
    "monthlyContribution" MONEY NOT NULL,
    "status" "GoalStatus" NOT NULL DEFAULT 'ACTIVE',
    "priceHistory" JSONB,
    "coachContext" TEXT,
    "autoUpdate" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Goal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GoalCheckpoint" (
    "id" TEXT NOT NULL,
    "goalId" TEXT NOT NULL,
    "percent" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "reached" BOOLEAN NOT NULL DEFAULT false,
    "reachedAt" TIMESTAMP(3),

    CONSTRAINT "GoalCheckpoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Rule" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "amount" MONEY NOT NULL,
    "frequency" "RuleFrequency" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Rule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Circle" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "target" MONEY NOT NULL,
    "type" "CircleType" NOT NULL,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Circle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CircleMembership" (
    "id" TEXT NOT NULL,
    "circleId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "contribution" MONEY NOT NULL DEFAULT 0,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "role" TEXT NOT NULL DEFAULT 'member',

    CONSTRAINT "CircleMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FutureScoreSnapshot" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "contribution" INTEGER NOT NULL,
    "discipline" INTEGER NOT NULL,
    "consistency" INTEGER NOT NULL,
    "social" INTEGER NOT NULL,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FutureScoreSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_authId_key" ON "User"("authId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_authId_idx" ON "User"("authId");

-- CreateIndex
CREATE INDEX "BankConnection_userId_active_idx" ON "BankConnection"("userId", "active");

-- CreateIndex
CREATE INDEX "Account_userId_idx" ON "Account"("userId");

-- CreateIndex
CREATE INDEX "Transaction_userId_occurredAt_idx" ON "Transaction"("userId", "occurredAt");

-- CreateIndex
CREATE INDEX "Transaction_userId_category_idx" ON "Transaction"("userId", "category");

-- CreateIndex
CREATE INDEX "Transaction_userId_isReducible_idx" ON "Transaction"("userId", "isReducible");

-- CreateIndex
CREATE INDEX "Subscription_userId_status_idx" ON "Subscription"("userId", "status");

-- CreateIndex
CREATE INDEX "AnalysisRun_userId_triggeredAt_idx" ON "AnalysisRun"("userId", "triggeredAt");

-- CreateIndex
CREATE INDEX "TransactionAnalysis_runId_idx" ON "TransactionAnalysis"("runId");

-- CreateIndex
CREATE INDEX "TransactionAnalysis_transactionId_idx" ON "TransactionAnalysis"("transactionId");

-- CreateIndex
CREATE INDEX "Goal_userId_status_idx" ON "Goal"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "GoalCheckpoint_goalId_percent_key" ON "GoalCheckpoint"("goalId", "percent");

-- CreateIndex
CREATE INDEX "Rule_userId_active_idx" ON "Rule"("userId", "active");

-- CreateIndex
CREATE INDEX "CircleMembership_userId_idx" ON "CircleMembership"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CircleMembership_circleId_userId_key" ON "CircleMembership"("circleId", "userId");

-- CreateIndex
CREATE INDEX "FutureScoreSnapshot_userId_computedAt_idx" ON "FutureScoreSnapshot"("userId", "computedAt");

-- CreateIndex
CREATE INDEX "Notification_userId_read_createdAt_idx" ON "Notification"("userId", "read", "createdAt");

-- AddForeignKey
ALTER TABLE "BankConnection" ADD CONSTRAINT "BankConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_bankConnId_fkey" FOREIGN KEY ("bankConnId") REFERENCES "BankConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalysisRun" ADD CONSTRAINT "AnalysisRun_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransactionAnalysis" ADD CONSTRAINT "TransactionAnalysis_runId_fkey" FOREIGN KEY ("runId") REFERENCES "AnalysisRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransactionAnalysis" ADD CONSTRAINT "TransactionAnalysis_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Goal" ADD CONSTRAINT "Goal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoalCheckpoint" ADD CONSTRAINT "GoalCheckpoint_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "Goal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rule" ADD CONSTRAINT "Rule_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CircleMembership" ADD CONSTRAINT "CircleMembership_circleId_fkey" FOREIGN KEY ("circleId") REFERENCES "Circle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CircleMembership" ADD CONSTRAINT "CircleMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FutureScoreSnapshot" ADD CONSTRAINT "FutureScoreSnapshot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateEnum
CREATE TYPE "ContributionSource" AS ENUM ('REDUCIBLE_TRANSACTION', 'CATEGORY_BUCKET', 'MANUAL', 'RULE_TRIGGERED');

-- CreateEnum
CREATE TYPE "ContributionStatus" AS ENUM ('PENDING', 'COMMITTED', 'REVERSED');

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'CONTRIBUTION_ACCEPTED';

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "acceptedContributionId" TEXT;

-- CreateTable
CREATE TABLE "MicroContribution" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" MONEY NOT NULL,
    "category" "SpendingCategory",
    "source" "ContributionSource" NOT NULL,
    "status" "ContributionStatus" NOT NULL DEFAULT 'PENDING',
    "sourceRef" TEXT,
    "goalId" TEXT,
    "ruleId" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "committedAt" TIMESTAMP(3),
    "reversedAt" TIMESTAMP(3),

    CONSTRAINT "MicroContribution_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MicroContribution_userId_createdAt_idx" ON "MicroContribution"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "MicroContribution_userId_status_idx" ON "MicroContribution"("userId", "status");

-- CreateIndex
CREATE INDEX "MicroContribution_userId_category_idx" ON "MicroContribution"("userId", "category");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_acceptedContributionId_key" ON "Transaction"("acceptedContributionId");

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_acceptedContributionId_fkey" FOREIGN KEY ("acceptedContributionId") REFERENCES "MicroContribution"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MicroContribution" ADD CONSTRAINT "MicroContribution_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MicroContribution" ADD CONSTRAINT "MicroContribution_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "Goal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MicroContribution" ADD CONSTRAINT "MicroContribution_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "Rule"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- CreateEnum
CREATE TYPE "PriceAlertDirection" AS ENUM ('INCREASE', 'DECREASE');

-- AlterTable
ALTER TABLE "Goal"
ADD COLUMN     "rawQuery" TEXT,
ADD COLUMN     "normalizedQuery" TEXT,
ADD COLUMN     "category" TEXT,
ADD COLUMN     "selectedProductTitle" TEXT,
ADD COLUMN     "productUrl" TEXT,
ADD COLUMN     "productImage" TEXT,
ADD COLUMN     "productSource" TEXT,
ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'TRY',
ADD COLUMN     "lastCheckedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "GoalPriceHistory" (
    "id" TEXT NOT NULL,
    "goalId" TEXT NOT NULL,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "price" MONEY NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'TRY',
    "source" TEXT NOT NULL,

    CONSTRAINT "GoalPriceHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GoalPriceAlert" (
    "id" TEXT NOT NULL,
    "goalId" TEXT NOT NULL,
    "oldPrice" MONEY NOT NULL,
    "newPrice" MONEY NOT NULL,
    "percentageChange" DECIMAL(8,6) NOT NULL,
    "direction" "PriceAlertDirection" NOT NULL,
    "remainingAmountImpact" MONEY NOT NULL,
    "monthlySavingNeeded" MONEY NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GoalPriceAlert_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GoalPriceHistory_goalId_checkedAt_idx" ON "GoalPriceHistory"("goalId", "checkedAt");

-- CreateIndex
CREATE INDEX "GoalPriceAlert_goalId_readAt_idx" ON "GoalPriceAlert"("goalId", "readAt");

-- AddForeignKey
ALTER TABLE "GoalPriceHistory" ADD CONSTRAINT "GoalPriceHistory_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "Goal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoalPriceAlert" ADD CONSTRAINT "GoalPriceAlert_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "Goal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

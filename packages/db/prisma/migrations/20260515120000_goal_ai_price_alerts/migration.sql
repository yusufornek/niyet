-- AddEnumValue
ALTER TYPE "NotificationType" ADD VALUE 'GOAL_PRICE_ALERT';

-- AlterTable
ALTER TABLE "Goal"
ADD COLUMN     "nextPriceCheckAt" TIMESTAMP(3),
ADD COLUMN     "priceCheckFailureCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "priceCheckPausedUntil" TIMESTAMP(3),
ADD COLUMN     "planSummary" TEXT,
ADD COLUMN     "planGeneratedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Goal_nextPriceCheckAt_idx" ON "Goal"("nextPriceCheckAt");

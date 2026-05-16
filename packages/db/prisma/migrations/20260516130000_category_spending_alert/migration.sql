-- CreateTable
CREATE TABLE "CategorySpendingAlert" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "category" "SpendingCategory" NOT NULL,
    "monthlyLimit" MONEY NOT NULL,
    "warnThresholdPct" DECIMAL(4, 3) NOT NULL DEFAULT 0.8,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "lastAlertedMonth" TEXT,
    "lastAlertedLevel" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CategorySpendingAlert_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CategorySpendingAlert_userId_category_key"
  ON "CategorySpendingAlert"("userId", "category");

-- CreateIndex
CREATE INDEX "CategorySpendingAlert_userId_active_idx"
  ON "CategorySpendingAlert"("userId", "active");

-- AddForeignKey
ALTER TABLE "CategorySpendingAlert"
  ADD CONSTRAINT "CategorySpendingAlert_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

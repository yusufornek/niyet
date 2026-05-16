-- CreateTable
CREATE TABLE "MonthlyContributionTarget" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "targetAmount" MONEY NOT NULL,
    "warnThresholdPct" DECIMAL(4, 3) NOT NULL DEFAULT 0.9,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "lastAlertedMonth" TEXT,
    "lastAlertedLevel" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MonthlyContributionTarget_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MonthlyContributionTarget_userId_key"
  ON "MonthlyContributionTarget"("userId");

-- AddForeignKey
ALTER TABLE "MonthlyContributionTarget"
  ADD CONSTRAINT "MonthlyContributionTarget_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

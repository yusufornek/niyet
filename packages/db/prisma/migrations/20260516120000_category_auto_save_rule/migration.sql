-- CreateTable
CREATE TABLE "CategoryAutoSaveRule" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "category" "SpendingCategory" NOT NULL,
    "lookbackMonths" INTEGER NOT NULL DEFAULT 3,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastTriggeredAt" TIMESTAMP(3),
    "lastTriggeredMonth" TEXT,
    "lastTransferAmount" MONEY,

    CONSTRAINT "CategoryAutoSaveRule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CategoryAutoSaveRule_userId_category_key"
  ON "CategoryAutoSaveRule"("userId", "category");

-- CreateIndex
CREATE INDEX "CategoryAutoSaveRule_userId_active_idx"
  ON "CategoryAutoSaveRule"("userId", "active");

-- AddForeignKey
ALTER TABLE "CategoryAutoSaveRule"
  ADD CONSTRAINT "CategoryAutoSaveRule_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

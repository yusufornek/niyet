-- Extend notification enum for important finance news alerts
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'FINANCE_NEWS_IMPORTANT';

-- Daily short finance news feed items
CREATE TABLE "FinanceNewsItem" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "summaryShort" TEXT NOT NULL,
  "sourceName" TEXT NOT NULL,
  "sourceUrl" TEXT NOT NULL,
  "publishedAt" TIMESTAMP(3) NOT NULL,
  "isImportant" BOOLEAN NOT NULL DEFAULT false,
  "importanceScore" INTEGER NOT NULL DEFAULT 0,
  "dedupeHash" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FinanceNewsItem_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FinanceNewsItem_dedupeHash_key" ON "FinanceNewsItem"("dedupeHash");
CREATE INDEX "FinanceNewsItem_publishedAt_idx" ON "FinanceNewsItem"("publishedAt" DESC);
CREATE INDEX "FinanceNewsItem_isImportant_publishedAt_idx" ON "FinanceNewsItem"("isImportant", "publishedAt" DESC);

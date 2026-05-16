-- Learn module foundation: sources, daily packs, cards, quizzes, user progress.

-- Enums
CREATE TYPE "LearnSourceType" AS ENUM ('EGM_PAGE', 'EGM_PDF', 'TUIK_API');
CREATE TYPE "LearnPackStatus" AS ENUM ('DRAFT', 'PUBLISHED');

-- Extend NotificationType
ALTER TYPE "NotificationType" ADD VALUE 'LEARN_UPDATE';

-- LearnDailyPack
CREATE TABLE "LearnDailyPack" (
  "id" TEXT NOT NULL,
  "packDate" TIMESTAMP(3) NOT NULL,
  "status" "LearnPackStatus" NOT NULL DEFAULT 'DRAFT',
  "sourceHash" TEXT NOT NULL,
  "summary" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "publishedAt" TIMESTAMP(3),
  CONSTRAINT "LearnDailyPack_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LearnDailyPack_packDate_key" ON "LearnDailyPack"("packDate");
CREATE INDEX "LearnDailyPack_status_packDate_idx" ON "LearnDailyPack"("status", "packDate");

-- LearnSourceSnapshot
CREATE TABLE "LearnSourceSnapshot" (
  "id" TEXT NOT NULL,
  "packId" TEXT NOT NULL,
  "sourceType" "LearnSourceType" NOT NULL,
  "sourceUrl" TEXT NOT NULL,
  "sourceTitle" TEXT NOT NULL,
  "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "effectiveDate" TIMESTAMP(3),
  "contentHash" TEXT NOT NULL,
  "rawContent" TEXT NOT NULL,
  CONSTRAINT "LearnSourceSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "LearnSourceSnapshot_packId_sourceType_idx" ON "LearnSourceSnapshot"("packId", "sourceType");
CREATE INDEX "LearnSourceSnapshot_sourceUrl_idx" ON "LearnSourceSnapshot"("sourceUrl");

-- LearnFact
CREATE TABLE "LearnFact" (
  "id" TEXT NOT NULL,
  "packId" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "valueText" TEXT NOT NULL,
  "valueNumber" DECIMAL(12,4),
  "unit" TEXT,
  "confidence" DECIMAL(5,2) NOT NULL,
  "sourceUrl" TEXT NOT NULL,
  "effectiveDate" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LearnFact_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "LearnFact_packId_key_idx" ON "LearnFact"("packId", "key");

-- LearnCard
CREATE TABLE "LearnCard" (
  "id" TEXT NOT NULL,
  "packId" TEXT NOT NULL,
  "orderNo" INTEGER NOT NULL,
  "slug" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "shortDescription" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "sourceName" TEXT NOT NULL,
  "sourceUrl" TEXT NOT NULL,
  "sourceUpdatedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LearnCard_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LearnCard_packId_orderNo_key" ON "LearnCard"("packId", "orderNo");
CREATE INDEX "LearnCard_packId_idx" ON "LearnCard"("packId");

-- LearnQuizItem
CREATE TABLE "LearnQuizItem" (
  "id" TEXT NOT NULL,
  "cardId" TEXT NOT NULL,
  "question" TEXT NOT NULL,
  "optionsJson" JSONB NOT NULL,
  "correctIndex" INTEGER NOT NULL,
  "explanation" TEXT NOT NULL,
  "explanationLlm" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LearnQuizItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "LearnQuizItem_cardId_idx" ON "LearnQuizItem"("cardId");

-- UserLearnState
CREATE TABLE "UserLearnState" (
  "userId" TEXT NOT NULL,
  "totalXp" INTEGER NOT NULL DEFAULT 0,
  "level" INTEGER NOT NULL DEFAULT 1,
  "streakDays" INTEGER NOT NULL DEFAULT 0,
  "lastActiveDate" TIMESTAMP(3),
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "UserLearnState_pkey" PRIMARY KEY ("userId")
);

-- UserLearnProgress
CREATE TABLE "UserLearnProgress" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "packId" TEXT NOT NULL,
  "cardId" TEXT NOT NULL,
  "quizScore" INTEGER NOT NULL DEFAULT 0,
  "xpEarned" INTEGER NOT NULL DEFAULT 0,
  "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserLearnProgress_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserLearnProgress_userId_cardId_key" ON "UserLearnProgress"("userId", "cardId");
CREATE INDEX "UserLearnProgress_userId_completedAt_idx" ON "UserLearnProgress"("userId", "completedAt");

-- Foreign keys
ALTER TABLE "LearnSourceSnapshot"
  ADD CONSTRAINT "LearnSourceSnapshot_packId_fkey"
  FOREIGN KEY ("packId") REFERENCES "LearnDailyPack"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "LearnFact"
  ADD CONSTRAINT "LearnFact_packId_fkey"
  FOREIGN KEY ("packId") REFERENCES "LearnDailyPack"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "LearnCard"
  ADD CONSTRAINT "LearnCard_packId_fkey"
  FOREIGN KEY ("packId") REFERENCES "LearnDailyPack"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "LearnQuizItem"
  ADD CONSTRAINT "LearnQuizItem_cardId_fkey"
  FOREIGN KEY ("cardId") REFERENCES "LearnCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UserLearnState"
  ADD CONSTRAINT "UserLearnState_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UserLearnProgress"
  ADD CONSTRAINT "UserLearnProgress_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UserLearnProgress"
  ADD CONSTRAINT "UserLearnProgress_packId_fkey"
  FOREIGN KEY ("packId") REFERENCES "LearnDailyPack"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UserLearnProgress"
  ADD CONSTRAINT "UserLearnProgress_cardId_fkey"
  FOREIGN KEY ("cardId") REFERENCES "LearnCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "Circle" ADD COLUMN "inviteCode" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Circle_inviteCode_key" ON "Circle"("inviteCode");

-- CreateTable
CREATE TABLE "CircleMilestoneLog" (
    "id" TEXT NOT NULL,
    "circleId" TEXT NOT NULL,
    "percent" INTEGER NOT NULL,
    "reachedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CircleMilestoneLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CircleMilestoneLog_circleId_percent_key"
  ON "CircleMilestoneLog"("circleId", "percent");

-- CreateIndex
CREATE INDEX "CircleMilestoneLog_circleId_idx"
  ON "CircleMilestoneLog"("circleId");

-- AddForeignKey
ALTER TABLE "CircleMilestoneLog"
  ADD CONSTRAINT "CircleMilestoneLog_circleId_fkey"
  FOREIGN KEY ("circleId") REFERENCES "Circle"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

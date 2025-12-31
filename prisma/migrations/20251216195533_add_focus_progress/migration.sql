-- AlterTable
ALTER TABLE "PracticeSession" ADD COLUMN     "lastCompletionSummary" JSONB;

-- CreateTable
CREATE TABLE "UserFocusProgress" (
    "id" TEXT NOT NULL,
    "whopUserId" TEXT NOT NULL,
    "nicheKey" TEXT NOT NULL,
    "focusKey" TEXT NOT NULL,
    "focusLabel" TEXT NOT NULL,
    "setsCompleted" INTEGER NOT NULL DEFAULT 0,
    "lastCompletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserFocusProgress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserFocusProgress_whopUserId_nicheKey_idx" ON "UserFocusProgress"("whopUserId", "nicheKey");

-- CreateIndex
CREATE UNIQUE INDEX "UserFocusProgress_whopUserId_nicheKey_focusKey_key" ON "UserFocusProgress"("whopUserId", "nicheKey", "focusKey");

-- CreateTable
CREATE TABLE "PracticeSession" (
    "id" SERIAL NOT NULL,
    "whopUserId" TEXT NOT NULL,
    "nicheKey" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PracticeSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PracticeSession_whopUserId_idx" ON "PracticeSession"("whopUserId");

-- CreateIndex
CREATE UNIQUE INDEX "PracticeSession_whopUserId_nicheKey_key" ON "PracticeSession"("whopUserId", "nicheKey");

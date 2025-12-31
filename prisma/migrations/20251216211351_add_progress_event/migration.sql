-- CreateTable
CREATE TABLE "ProgressEvent" (
    "id" TEXT NOT NULL,
    "whopUserId" TEXT NOT NULL,
    "experienceId" TEXT NOT NULL,
    "sessionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProgressEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProgressEvent_whopUserId_experienceId_idx" ON "ProgressEvent"("whopUserId", "experienceId");

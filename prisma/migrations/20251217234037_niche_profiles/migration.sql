/*
  Warnings:

  - A unique constraint covering the columns `[clientCompletionId]` on the table `ProgressEvent` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateTable
CREATE TABLE "user_niche_profile" (
    "id" TEXT NOT NULL,
    "experienceId" TEXT NOT NULL,
    "whopUserId" TEXT NOT NULL,
    "nicheKey" TEXT NOT NULL,
    "customNiche" TEXT,
    "state" TEXT,
    "country" TEXT,
    "testType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_niche_profile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_niche_profile_experienceId_whopUserId_idx" ON "user_niche_profile"("experienceId", "whopUserId");

-- CreateIndex
CREATE UNIQUE INDEX "user_niche_profile_experienceId_whopUserId_nicheKey_customN_key" ON "user_niche_profile"("experienceId", "whopUserId", "nicheKey", "customNiche");

-- CreateIndex (already exists)
-- CREATE UNIQUE INDEX "ProgressEvent_clientCompletionId_key" ON "ProgressEvent"("clientCompletionId");

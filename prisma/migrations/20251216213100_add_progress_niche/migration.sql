-- AlterTable
ALTER TABLE "ProgressEvent" ADD COLUMN     "niche" TEXT;

-- CreateIndex
CREATE INDEX "ProgressEvent_whopUserId_experienceId_niche_idx" ON "ProgressEvent"("whopUserId", "experienceId", "niche");

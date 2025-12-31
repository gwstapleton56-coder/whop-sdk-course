/*
  Warnings:

  - You are about to drop the column `niche` on the `ProgressEvent` table. All the data in the column will be lost.
  - Added the required column `primaryNiche` to the `ProgressEvent` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "ProgressEvent_whopUserId_experienceId_idx";

-- DropIndex
DROP INDEX "ProgressEvent_whopUserId_experienceId_niche_idx";

-- AlterTable
ALTER TABLE "ProgressEvent" DROP COLUMN "niche",
ADD COLUMN     "customNiche" TEXT,
ADD COLUMN     "primaryNiche" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "ProgressEvent_whopUserId_experienceId_primaryNiche_idx" ON "ProgressEvent"("whopUserId", "experienceId", "primaryNiche");

-- CreateIndex
CREATE INDEX "ProgressEvent_whopUserId_experienceId_primaryNiche_customNi_idx" ON "ProgressEvent"("whopUserId", "experienceId", "primaryNiche", "customNiche");

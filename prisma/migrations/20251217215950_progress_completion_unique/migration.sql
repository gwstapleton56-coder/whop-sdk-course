/*
  Warnings:

  - A unique constraint covering the columns `[clientCompletionId]` on the table `ProgressEvent` will be added. If there are existing duplicate values, this will fail.
  - Made the column `clientCompletionId` on table `ProgressEvent` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "ProgressEvent" ALTER COLUMN "clientCompletionId" SET NOT NULL;

-- CreateIndex (already exists)
-- CREATE UNIQUE INDEX "ProgressEvent_clientCompletionId_key" ON "ProgressEvent"("clientCompletionId");

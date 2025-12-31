-- CreateTable
CREATE TABLE "support_ticket" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "whopUserId" TEXT NOT NULL,
    "experienceId" TEXT NOT NULL,
    "niche" TEXT,
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',

    CONSTRAINT "support_ticket_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "support_ticket_whopUserId_idx" ON "support_ticket"("whopUserId");

-- CreateIndex
CREATE INDEX "support_ticket_experienceId_idx" ON "support_ticket"("experienceId");

-- CreateIndex
CREATE INDEX "support_ticket_status_createdAt_idx" ON "support_ticket"("status", "createdAt");




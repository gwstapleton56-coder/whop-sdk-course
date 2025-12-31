-- CreateTable
CREATE TABLE "coach_thread" (
    "id" TEXT NOT NULL,
    "experienceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "coach_thread_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coach_message" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "coach_message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "global_coach_settings" (
    "id" TEXT NOT NULL,
    "experienceId" TEXT NOT NULL,
    "systemPrompt" TEXT NOT NULL DEFAULT 'You are a strict but helpful coach...',
    "tone" TEXT NOT NULL DEFAULT 'direct',
    "enableQuiz" BOOLEAN NOT NULL DEFAULT true,
    "enablePlan" BOOLEAN NOT NULL DEFAULT true,
    "enableRoleplay" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "global_coach_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "coach_thread_experienceId_userId_idx" ON "coach_thread"("experienceId", "userId");

-- CreateIndex
CREATE INDEX "coach_message_threadId_createdAt_idx" ON "coach_message"("threadId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "global_coach_settings_experienceId_key" ON "global_coach_settings"("experienceId");

-- AddForeignKey
ALTER TABLE "coach_message" ADD CONSTRAINT "coach_message_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "coach_thread"("id") ON DELETE CASCADE ON UPDATE CASCADE;


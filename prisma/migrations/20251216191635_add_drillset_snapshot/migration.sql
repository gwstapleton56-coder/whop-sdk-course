-- CreateTable
CREATE TABLE "DrillSet" (
    "id" SERIAL NOT NULL,
    "sessionId" INTEGER NOT NULL,
    "struggle" TEXT NOT NULL,
    "objective" TEXT NOT NULL,
    "practicePreference" TEXT NOT NULL,
    "nicheKey" TEXT NOT NULL,
    "customNiche" TEXT,
    "drillsJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DrillSet_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DrillSet_sessionId_createdAt_idx" ON "DrillSet"("sessionId", "createdAt");

-- AddForeignKey
ALTER TABLE "DrillSet" ADD CONSTRAINT "DrillSet_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "PracticeSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "CreatorSettings" (
    "experienceId" TEXT NOT NULL,
    "globalContext" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreatorSettings_pkey" PRIMARY KEY ("experienceId")
);

-- CreateTable
CREATE TABLE "niche_preset" (
    "id" TEXT NOT NULL,
    "experienceId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "aiContext" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "niche_preset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "niche_preset_experienceId_sortOrder_idx" ON "niche_preset"("experienceId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "niche_preset_experienceId_key_key" ON "niche_preset"("experienceId", "key");

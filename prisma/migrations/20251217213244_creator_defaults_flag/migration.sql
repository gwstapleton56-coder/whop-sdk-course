/*
  Warnings:

  - You are about to drop the `CreatorSettings` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "CreatorSettings";

-- CreateTable
CREATE TABLE "creator_settings" (
    "experienceId" TEXT NOT NULL,
    "globalContext" TEXT,
    "allowAutoDefaults" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "creator_settings_pkey" PRIMARY KEY ("experienceId")
);

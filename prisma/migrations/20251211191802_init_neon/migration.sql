-- CreateEnum
CREATE TYPE "Niche" AS ENUM ('TRADING', 'FITNESS', 'BUSINESS', 'TECH', 'BEAUTY', 'OTHER');

-- CreateTable
CREATE TABLE "UserProfile" (
    "id" SERIAL NOT NULL,
    "whopUserId" TEXT NOT NULL,
    "primaryNiche" "Niche",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserProfile_whopUserId_key" ON "UserProfile"("whopUserId");

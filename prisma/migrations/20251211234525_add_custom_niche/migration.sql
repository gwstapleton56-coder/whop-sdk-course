/*
  Warnings:

  - The values [BUSINESS,TECH,BEAUTY,OTHER] on the enum `Niche` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "Niche_new" AS ENUM ('TRADING', 'SPORTS', 'SOCIAL_MEDIA', 'RESELLING', 'FITNESS', 'CUSTOM');
ALTER TABLE "UserProfile" ALTER COLUMN "primaryNiche" TYPE "Niche_new" USING ("primaryNiche"::text::"Niche_new");
ALTER TYPE "Niche" RENAME TO "Niche_old";
ALTER TYPE "Niche_new" RENAME TO "Niche";
DROP TYPE "public"."Niche_old";
COMMIT;

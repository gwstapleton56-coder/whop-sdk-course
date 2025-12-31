-- Drop old indexes if they exist
DROP INDEX IF EXISTS "ProgressEvent_whopUserId_experienceId_primaryNiche_idx";
DROP INDEX IF EXISTS "ProgressEvent_whopUserId_experienceId_primaryNiche_customNi_idx";
DROP INDEX IF EXISTS "ProgressEvent_whopUserId_experienceId_idx";
DROP INDEX IF EXISTS "ProgressEvent_whopUserId_experienceId_niche_idx";

-- Add clientCompletionId column (nullable first, we'll make it unique after)
ALTER TABLE "ProgressEvent" ADD COLUMN IF NOT EXISTS "clientCompletionId" TEXT;

-- Add niche enum column (temporary, nullable)
ALTER TABLE "ProgressEvent" ADD COLUMN IF NOT EXISTS "niche_temp" "Niche";

-- Migrate data: convert primaryNiche string to niche enum
-- Map common values to enum, default to TRADING if unknown
UPDATE "ProgressEvent" 
SET "niche_temp" = CASE 
  WHEN "primaryNiche" = 'TRADING' THEN 'TRADING'::"Niche"
  WHEN "primaryNiche" = 'SPORTS' THEN 'SPORTS'::"Niche"
  WHEN "primaryNiche" = 'SOCIAL_MEDIA' THEN 'SOCIAL_MEDIA'::"Niche"
  WHEN "primaryNiche" = 'RESELLING' THEN 'RESELLING'::"Niche"
  WHEN "primaryNiche" = 'FITNESS' THEN 'FITNESS'::"Niche"
  WHEN "primaryNiche" = 'CUSTOM' THEN 'CUSTOM'::"Niche"
  ELSE 'TRADING'::"Niche"
END;

-- Drop old columns
ALTER TABLE "ProgressEvent" 
  DROP COLUMN IF EXISTS "experienceId",
  DROP COLUMN IF EXISTS "sessionId",
  DROP COLUMN IF EXISTS "primaryNiche";

-- Drop old niche column if it exists
ALTER TABLE "ProgressEvent" DROP COLUMN IF EXISTS "niche";

-- Rename temp column to final name
ALTER TABLE "ProgressEvent" RENAME COLUMN "niche_temp" TO "niche";

-- Make it NOT NULL
ALTER TABLE "ProgressEvent" ALTER COLUMN "niche" SET NOT NULL;

-- Create unique constraint on clientCompletionId
CREATE UNIQUE INDEX IF NOT EXISTS "ProgressEvent_clientCompletionId_key" ON "ProgressEvent"("clientCompletionId") WHERE "clientCompletionId" IS NOT NULL;

-- Create new indexes
CREATE INDEX IF NOT EXISTS "ProgressEvent_whopUserId_niche_idx" ON "ProgressEvent"("whopUserId", "niche");
CREATE INDEX IF NOT EXISTS "ProgressEvent_whopUserId_niche_customNiche_idx" ON "ProgressEvent"("whopUserId", "niche", "customNiche");


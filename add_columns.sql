-- Add coachName to global_coach_settings
ALTER TABLE "global_coach_settings" 
ADD COLUMN IF NOT EXISTS "coachName" TEXT DEFAULT 'AI Coach';

-- Add resources to global_coach_settings
ALTER TABLE "global_coach_settings" 
ADD COLUMN IF NOT EXISTS "resources" JSONB;

-- Add resources to creator_settings
ALTER TABLE "creator_settings" 
ADD COLUMN IF NOT EXISTS "resources" JSONB;

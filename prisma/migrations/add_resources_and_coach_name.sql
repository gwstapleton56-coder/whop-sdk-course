-- Add resources column to creator_settings if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'creator_settings' 
    AND column_name = 'resources'
  ) THEN
    ALTER TABLE "creator_settings" ADD COLUMN "resources" JSONB;
  END IF;
END $$;

-- Add coachName column to global_coach_settings if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'global_coach_settings' 
    AND column_name = 'coachName'
  ) THEN
    ALTER TABLE "global_coach_settings" ADD COLUMN "coachName" TEXT DEFAULT 'AI Coach';
  END IF;
END $$;

-- Add resources column to global_coach_settings if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'global_coach_settings' 
    AND column_name = 'resources'
  ) THEN
    ALTER TABLE "global_coach_settings" ADD COLUMN "resources" JSONB;
  END IF;
END $$;


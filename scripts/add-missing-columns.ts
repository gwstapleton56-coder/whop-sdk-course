/**
 * Script to add missing database columns for resources and coachName
 * Run with: npx tsx scripts/add-missing-columns.ts
 * 
 * This script uses raw SQL to add columns if they don't exist,
 * avoiding Prisma migration issues.
 */

import "dotenv/config";
import pg from "pg";

async function addColumns() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    console.error("❌ DATABASE_URL is not set in environment variables");
    process.exit(1);
  }

  const client = new pg.Client({ connectionString });

  try {
    await client.connect();
    console.log("✅ Connected to database");

    // Add resources to creator_settings
    console.log("Adding resources column to creator_settings...");
    await client.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'creator_settings' 
          AND column_name = 'resources'
        ) THEN
          ALTER TABLE "creator_settings" ADD COLUMN "resources" JSONB;
          RAISE NOTICE 'Added resources column to creator_settings';
        ELSE
          RAISE NOTICE 'resources column already exists in creator_settings';
        END IF;
      END $$;
    `);
    console.log("✅ creator_settings.resources column ready");

    // Add coachName to global_coach_settings
    console.log("Adding coachName column to global_coach_settings...");
    await client.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'global_coach_settings' 
          AND column_name = 'coachName'
        ) THEN
          ALTER TABLE "global_coach_settings" ADD COLUMN "coachName" TEXT DEFAULT 'AI Coach';
          RAISE NOTICE 'Added coachName column to global_coach_settings';
        ELSE
          RAISE NOTICE 'coachName column already exists in global_coach_settings';
        END IF;
      END $$;
    `);
    console.log("✅ global_coach_settings.coachName column ready");

    // Add resources to global_coach_settings
    console.log("Adding resources column to global_coach_settings...");
    await client.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'global_coach_settings' 
          AND column_name = 'resources'
        ) THEN
          ALTER TABLE "global_coach_settings" ADD COLUMN "resources" JSONB;
          RAISE NOTICE 'Added resources column to global_coach_settings';
        ELSE
          RAISE NOTICE 'resources column already exists in global_coach_settings';
        END IF;
      END $$;
    `);
    console.log("✅ global_coach_settings.resources column ready");

    console.log("\n🎉 All columns added successfully!");
    console.log("\nYou can now use the admin panel to save resources and coach names.");

  } catch (error: any) {
    console.error("❌ Error adding columns:", error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

addColumns();


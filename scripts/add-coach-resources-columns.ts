import { prisma } from "../lib/db";

async function main() {
  console.log("Adding coach name and resources columns...");

  try {
    // Add coachName to global_coach_settings if it doesn't exist
    await prisma.$executeRawUnsafe(`
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
    `);

    // Add resources to global_coach_settings if it doesn't exist
    await prisma.$executeRawUnsafe(`
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
    `);

    // Add resources to creator_settings if it doesn't exist
    await prisma.$executeRawUnsafe(`
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
    `);

    console.log("✅ Columns added successfully!");
  } catch (error) {
    console.error("❌ Error adding columns:", error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


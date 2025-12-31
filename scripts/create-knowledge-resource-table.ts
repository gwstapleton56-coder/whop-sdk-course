import "dotenv/config";
import { prisma } from "../lib/db";

async function createTable() {
  try {
    console.log("Creating knowledge_resource table...");

    await (prisma as any).$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "knowledge_resource" (
        "id" TEXT NOT NULL,
        "experienceId" TEXT NOT NULL,
        "scope" TEXT NOT NULL,
        "type" TEXT NOT NULL,
        "title" TEXT NOT NULL,
        "url" TEXT NOT NULL,
        "description" TEXT,
        "nicheKey" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "knowledge_resource_pkey" PRIMARY KEY ("id")
      );
    `);

    await (prisma as any).$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "knowledge_resource_experienceId_scope_idx" 
      ON "knowledge_resource"("experienceId", "scope");
    `);

    await (prisma as any).$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "knowledge_resource_experienceId_scope_nicheKey_idx" 
      ON "knowledge_resource"("experienceId", "scope", "nicheKey");
    `);

    console.log("✅ knowledge_resource table created successfully");
  } catch (error: any) {
    console.error("❌ Error creating table:", error?.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

createTable();


import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { whopsdk } from "@/lib/whop-sdk";
import { prisma } from "@/lib/db";
import { isOwner } from "@/lib/access";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const experienceId = searchParams.get("experienceId");

    if (!experienceId) {
      return NextResponse.json({ error: "Missing experienceId" }, { status: 400 });
    }

    const headerList = await headers();
    const { userId } = await whopsdk.verifyUserToken(headerList);
    const access = await whopsdk.users.checkAccess(experienceId, { id: userId });
    
    if (!isOwner(access)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const settings = await (prisma as any).creatorSettings.findUnique({
      where: { experienceId },
    });

    // Try to get resources using raw SQL (works even if column doesn't exist in Prisma schema)
    let resources: any[] = [];
    try {
      // Try camelCase first (quoted)
      let result;
      try {
        result = await (prisma as any).$queryRawUnsafe(
          `SELECT "resources" FROM "creator_settings" WHERE "experienceId" = $1`,
          experienceId
        );
      } catch (e1: any) {
        // If that fails, try snake_case (unquoted, auto-lowercased)
        result = await (prisma as any).$queryRawUnsafe(
          `SELECT "resources" FROM "creator_settings" WHERE experience_id = $1`,
          experienceId
        );
      }
      if (result && result[0] && result[0].resources) {
        resources = Array.isArray(result[0].resources) ? result[0].resources : [];
      }
    } catch (e: any) {
      // Column doesn't exist or query failed, use empty array
      resources = [];
    }

    return NextResponse.json({ 
      ok: true, 
      settings: {
        globalContext: settings?.globalContext || null,
        resources,
      }
    });
  } catch (err: any) {
    console.error("creator/settings GET error:", err);
    return NextResponse.json({ error: err?.message || "Failed" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);

    const experienceId = body?.experienceId as string | undefined;
    const globalContext = body?.globalContext as string | undefined;
    const resources = body?.resources as any[] | undefined;

    if (!experienceId) {
      return NextResponse.json({ error: "Missing experienceId" }, { status: 400 });
    }

    const headerList = await headers();
    const { userId } = await whopsdk.verifyUserToken(headerList);
    const access = await whopsdk.users.checkAccess(experienceId, { id: userId });
    
    if (!isOwner(access)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // First, ensure the record exists (upsert without resources)
    const baseData: any = {};
    if (globalContext !== undefined) {
      baseData.globalContext = globalContext?.trim() || null;
    }

    // Upsert the base record first
    const saved = await (prisma as any).creatorSettings.upsert({
      where: { experienceId },
      update: baseData,
      create: { 
        experienceId, 
        globalContext: globalContext?.trim() || null,
      },
    });

    // If resources are provided, update them using raw SQL (works even if column doesn't exist yet)
    if (resources !== undefined) {
      try {
        console.log(`[SAVE RESOURCES] Starting save for ${experienceId}, ${resources?.length || 0} resources`);
        
        // First, ensure the column exists
        await (prisma as any).$executeRawUnsafe(
          `ALTER TABLE "creator_settings" ADD COLUMN IF NOT EXISTS "resources" JSONB;`
        );
        console.log(`[SAVE RESOURCES] Column ensured to exist`);
        
        // Use Prisma's field name directly (experienceId as defined in schema)
        // Prisma uses the exact field name when quoted
        const resourcesJson = JSON.stringify(resources || null);
        console.log(`[SAVE RESOURCES] Resources JSON:`, resourcesJson.substring(0, 200));
        
        // Try updating with experienceId (camelCase, quoted)
        let updateSuccess = false;
        try {
          const result = await (prisma as any).$executeRawUnsafe(
            `UPDATE "creator_settings" SET "resources" = $1::jsonb WHERE "experienceId" = $2`,
            resourcesJson,
            experienceId
          );
          console.log(`[SAVE RESOURCES] Update result (camelCase):`, result);
          updateSuccess = true;
        } catch (colError: any) {
          console.log(`[SAVE RESOURCES] camelCase failed, trying snake_case:`, colError?.message);
          // If camelCase fails, try snake_case (unquoted, auto-lowercased by PostgreSQL)
          try {
            const result = await (prisma as any).$executeRawUnsafe(
              `UPDATE "creator_settings" SET "resources" = $1::jsonb WHERE experience_id = $2`,
              resourcesJson,
              experienceId
            );
            console.log(`[SAVE RESOURCES] Update result (snake_case):`, result);
            updateSuccess = true;
          } catch (snakeError: any) {
            console.error(`[SAVE RESOURCES] Both formats failed:`, snakeError?.message);
            throw snakeError;
          }
        }
        
        if (!updateSuccess) {
          throw new Error("Update query did not succeed");
        }
        
        // Verify the save by reading it back
        let verifyResult;
        try {
          verifyResult = await (prisma as any).$queryRawUnsafe(
            `SELECT "resources" FROM "creator_settings" WHERE "experienceId" = $1`,
            experienceId
          );
        } catch (e1: any) {
          verifyResult = await (prisma as any).$queryRawUnsafe(
            `SELECT "resources" FROM "creator_settings" WHERE experience_id = $1`,
            experienceId
          );
        }
        
        const verifiedResources = verifyResult?.[0]?.resources;
        console.log(`[SAVE RESOURCES] Verified saved resources:`, verifiedResources ? `${Array.isArray(verifiedResources) ? verifiedResources.length : 'non-array'} items` : 'null/undefined');
        
        console.log(`✅ Saved ${resources?.length || 0} resources for experience ${experienceId}`);
      } catch (sqlError: any) {
        console.error("[SAVE RESOURCES] Error saving resources:", sqlError);
        console.error("[SAVE RESOURCES] Error details:", {
          message: sqlError?.message,
          code: sqlError?.code,
          meta: sqlError?.meta,
          stack: sqlError?.stack,
        });
        
        // Return error so frontend knows it failed
        return NextResponse.json({ 
          ok: false,
          error: `Failed to save resources: ${sqlError?.message || "Unknown error"}`,
          saved,
          debug: process.env.NODE_ENV === "development" ? {
            message: sqlError?.message,
            code: sqlError?.code,
          } : undefined,
        }, { status: 500 });
      }
    }

    // Fetch the updated record with resources using raw SQL
    let finalResources: any[] = [];
    try {
      let result;
      try {
        result = await (prisma as any).$queryRawUnsafe(
          `SELECT "resources" FROM "creator_settings" WHERE "experienceId" = $1`,
          experienceId
        );
      } catch (e1: any) {
        result = await (prisma as any).$queryRawUnsafe(
          `SELECT "resources" FROM "creator_settings" WHERE experience_id = $1`,
          experienceId
        );
      }
      if (result && result[0] && result[0].resources) {
        finalResources = Array.isArray(result[0].resources) ? result[0].resources : [];
      }
    } catch (e: any) {
      // Column doesn't exist yet, use empty array
      finalResources = [];
    }

    const updated = await (prisma as any).creatorSettings.findUnique({
      where: { experienceId },
    });

    // Always return the resources we just saved/fetched
    return NextResponse.json({ 
      ok: true, 
      saved: {
        ...updated,
        resources: resources !== undefined ? resources : finalResources,
      }
    });
  } catch (err: any) {
    console.error("creator/settings POST error:", err);
    console.error("Error details:", {
      message: err?.message,
      code: err?.code,
      meta: err?.meta,
    });
    return NextResponse.json({ 
      error: err?.message || "Failed to save settings",
      details: process.env.NODE_ENV === "development" ? err?.stack : undefined,
    }, { status: 500 });
  }
}


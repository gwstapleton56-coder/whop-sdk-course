import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { whopsdk } from "@/lib/whop-sdk";
import { prisma } from "@/lib/db";
import { isOwner } from "@/lib/access";

export async function GET(req: Request) {
  try {
    const headerList = await headers();
    const { userId } = await whopsdk.verifyUserToken(headerList);

    const { searchParams } = new URL(req.url);
    const experienceId = searchParams.get("experienceId");
    if (!experienceId) {
      return NextResponse.json({ error: "Missing experienceId" }, { status: 400 });
    }

    // Check if user is owner of this specific experience
    const access = await whopsdk.users.checkAccess(experienceId, { id: userId });
    if (!isOwner(access)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const settings = await (prisma as any).globalCoachSettings.findUnique({
      where: { experienceId },
    });

    // Try to get coachName and resources using raw SQL (works even if columns don't exist in Prisma schema)
    let coachName = settings?.coachName || null;
    let resources: any[] = [];
    
    try {
      const result = await (prisma as any).$queryRawUnsafe(
        `SELECT "coachName", "resources" FROM "global_coach_settings" WHERE "experienceId" = $1`,
        experienceId
      );
      if (result && result[0]) {
        if (result[0].coachName !== undefined) coachName = result[0].coachName;
        if (result[0].resources) {
          resources = Array.isArray(result[0].resources) ? result[0].resources : [];
        }
      }
    } catch (e: any) {
      // Columns may not exist, use defaults
    }

    return NextResponse.json({ 
      settings: {
        ...settings,
        coachName: coachName || "AI Coach",
        resources,
      }
    });
  } catch (error: any) {
    console.error("Error fetching coach settings:", error);
    return NextResponse.json({ error: error?.message || "Failed to fetch settings" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const headerList = await headers();
    const { userId } = await whopsdk.verifyUserToken(headerList);

    const body = await req.json().catch(() => null);
    const { experienceId, coachName, systemPrompt, communityContext, resources, tone, enableQuiz, enablePlan, enableRoleplay } = body || {};

    if (!experienceId) {
      return NextResponse.json({ error: "Missing experienceId" }, { status: 400 });
    }

    // Check if user is owner of this specific experience
    const access = await whopsdk.users.checkAccess(experienceId, { id: userId });
    if (!isOwner(access)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Build update data for known columns
    const updateData: any = {};
    if (systemPrompt !== undefined) updateData.systemPrompt = systemPrompt;
    if (communityContext !== undefined) updateData.communityContext = communityContext || null;
    if (tone !== undefined) updateData.tone = tone;
    if (enableQuiz !== undefined) updateData.enableQuiz = enableQuiz;
    if (enablePlan !== undefined) updateData.enablePlan = enablePlan;
    if (enableRoleplay !== undefined) updateData.enableRoleplay = enableRoleplay;

    // Upsert base record first
    const createData: any = {
      experienceId,
      systemPrompt: systemPrompt || "You are a strict but helpful coach...",
      communityContext: communityContext || null,
      tone: tone || "direct",
      enableQuiz: enableQuiz ?? true,
      enablePlan: enablePlan ?? true,
      enableRoleplay: enableRoleplay ?? true,
    };

    const settings = await (prisma as any).globalCoachSettings.upsert({
      where: { experienceId },
      update: updateData,
      create: createData,
    });

    // Handle coachName using raw SQL if provided
    if (coachName !== undefined) {
      try {
        await (prisma as any).$executeRawUnsafe(
          `UPDATE "global_coach_settings" SET "coachName" = $1 WHERE "experienceId" = $2`,
          coachName || "AI Coach",
          experienceId
        );
      } catch (sqlError: any) {
        if (sqlError?.message?.includes("column") && sqlError?.message?.includes("coachName")) {
          try {
            await (prisma as any).$executeRawUnsafe(
              `ALTER TABLE "global_coach_settings" ADD COLUMN IF NOT EXISTS "coachName" TEXT DEFAULT 'AI Coach';`
            );
            await (prisma as any).$executeRawUnsafe(
              `UPDATE "global_coach_settings" SET "coachName" = $1 WHERE "experienceId" = $2`,
              coachName || "AI Coach",
              experienceId
            );
          } catch (addColumnError: any) {
            console.warn("Could not add coachName column:", addColumnError?.message);
          }
        }
      }
    }

    // Handle resources using raw SQL if provided
    if (resources !== undefined) {
      try {
        await (prisma as any).$executeRawUnsafe(
          `UPDATE "global_coach_settings" SET "resources" = $1::jsonb WHERE "experienceId" = $2`,
          JSON.stringify(resources || null),
          experienceId
        );
      } catch (sqlError: any) {
        if (sqlError?.message?.includes("column") && sqlError?.message?.includes("resources")) {
          try {
            await (prisma as any).$executeRawUnsafe(
              `ALTER TABLE "global_coach_settings" ADD COLUMN IF NOT EXISTS "resources" JSONB;`
            );
            await (prisma as any).$executeRawUnsafe(
              `UPDATE "global_coach_settings" SET "resources" = $1::jsonb WHERE "experienceId" = $2`,
              JSON.stringify(resources || null),
              experienceId
            );
          } catch (addColumnError: any) {
            console.warn("Could not add resources column:", addColumnError?.message);
          }
        }
      }
    }

    // Fetch updated settings
    const updated = await (prisma as any).globalCoachSettings.findUnique({
      where: { experienceId },
    });

    return NextResponse.json({ settings: updated });
  } catch (error: any) {
    console.error("Error updating coach settings:", error);
    console.error("Error details:", {
      message: error?.message,
      code: error?.code,
      meta: error?.meta,
    });
    return NextResponse.json({ 
      error: error?.message || "Failed to update settings",
      details: process.env.NODE_ENV === "development" ? error?.stack : undefined,
    }, { status: 500 });
  }
}


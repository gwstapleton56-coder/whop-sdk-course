import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const experienceId = searchParams.get("experienceId");
    if (!experienceId) {
      return NextResponse.json({ error: "Missing experienceId" }, { status: 400 });
    }

    // Try to get coachName using raw SQL (works even if column doesn't exist in Prisma schema)
    let coachName = "AI Coach"; // Default
    
    try {
      let result;
      try {
        result = await (prisma as any).$queryRawUnsafe(
          `SELECT "coachName" FROM "global_coach_settings" WHERE "experienceId" = $1`,
          experienceId
        );
      } catch (e1: any) {
        result = await (prisma as any).$queryRawUnsafe(
          `SELECT "coachName" FROM "global_coach_settings" WHERE experience_id = $1`,
          experienceId
        );
      }
      if (result && result[0] && result[0].coachName) {
        coachName = result[0].coachName;
      }
    } catch (e: any) {
      // Column may not exist, use default
    }

    return NextResponse.json({ coachName });
  } catch (error: any) {
    console.error("Error fetching coach name:", error);
    return NextResponse.json({ coachName: "AI Coach" }); // Return default on error
  }
}



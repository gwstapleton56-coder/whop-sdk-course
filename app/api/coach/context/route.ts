import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { whopsdk } from "@/lib/whop-sdk";
import { prisma } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const headerList = await headers();
    const { userId } = await whopsdk.verifyUserToken(headerList);

    const { searchParams } = new URL(req.url);
    const experienceId = searchParams.get("experienceId");
    if (!experienceId) {
      return NextResponse.json({ error: "Missing experienceId" }, { status: 400 });
    }

    // Get user's most recent practice session to find their current niche
    const recentSession = await (prisma as any).practiceSession.findFirst({
      where: { whopUserId: userId },
      orderBy: { updatedAt: "desc" },
      select: {
        nicheKey: true,
      },
    });

    const nicheKey = recentSession?.nicheKey || null;
    
    // Get custom niche from profile if needed
    const profile = await (prisma as any).userProfile.findUnique({
      where: { whopUserId: userId },
      select: {
        customNiche: true,
      },
    });
    
    const customNiche = (profile as any)?.customNiche || null;

    // Get niche label if it's a preset
    let nicheLabel = null;
    if (nicheKey && nicheKey !== "custom") {
      const preset = await (prisma as any).nichePreset.findFirst({
        where: { key: nicheKey, enabled: true },
        select: { label: true },
      });
      nicheLabel = preset?.label || null;
    } else if (nicheKey === "custom" && customNiche) {
      nicheLabel = customNiche;
    }

    // Get the most recent practice session for this niche to get the "struggle" or problem
    let currentProblem = null;
    if (nicheKey) {
      const session = await (prisma as any).practiceSession.findFirst({
        where: {
          whopUserId: userId,
          nicheKey: nicheKey,
        },
        orderBy: { updatedAt: "desc" },
        select: {
          data: true,
        },
      });

      if (session?.data) {
        const sessionData = session.data as any;
        // Extract the struggle/problem from the session
        if (sessionData.struggle) {
          currentProblem = String(sessionData.struggle).trim();
        } else if (sessionData.objective) {
          currentProblem = String(sessionData.objective).trim();
        }
      }
    }

    return NextResponse.json({
      nicheKey,
      nicheLabel,
      currentProblem,
      hasContext: !!(nicheKey && nicheLabel),
    });
  } catch (error: any) {
    console.error("Error fetching coach context:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch context" },
      { status: 500 }
    );
  }
}


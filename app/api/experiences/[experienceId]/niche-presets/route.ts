import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { whopsdk } from "@/lib/whop-sdk";
import { prisma } from "@/lib/db";

// Public endpoint - any authenticated user can fetch enabled presets
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ experienceId: string }> }
) {
  try {
    const { experienceId } = await params;
    
    // Verify user is authenticated (but don't require admin)
    const headerList = await headers();
    await whopsdk.verifyUserToken(headerList);

    const presets = await (prisma as any).nichePreset.findMany({
      where: { experienceId, enabled: true },
      orderBy: { sortOrder: "asc" },
      select: { key: true, label: true, enabled: true, icon: true, sortOrder: true },
    });

    return NextResponse.json({ presets });
  } catch (error: any) {
    console.error("[PUBLIC] Error fetching presets:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch presets" },
      { status: 500 }
    );
  }
}



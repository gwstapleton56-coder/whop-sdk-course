import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { whopsdk } from "@/lib/whop-sdk";
import { prisma } from "@/lib/db";
import { Niche } from "@prisma/client";

export async function GET(req: Request) {
  try {
    const { userId } = await whopsdk.verifyUserToken(await headers());

    const { searchParams } = new URL(req.url);
    const niche = searchParams.get("niche") as Niche | null;
    const customNiche = searchParams.get("customNiche");

    if (!niche) {
      return NextResponse.json({ error: "Missing niche" }, { status: 400 });
    }

    const where =
      niche === "CUSTOM"
        ? {
            whopUserId: userId,
            niche,
            customNiche: (customNiche ?? "").trim(),
          }
        : {
            whopUserId: userId,
            niche,
            customNiche: null,
          };

    if (niche === "CUSTOM" && !where.customNiche) {
      return NextResponse.json(
        { error: "customNiche required when niche=CUSTOM" },
        { status: 400 }
      );
    }

    // @ts-ignore - Prisma types may not be fully updated yet
    const totalCompletedInNiche = await prisma.progressEvent.count({ where });
    
    // Get last completion timestamp
    // @ts-ignore
    const lastEvent = await prisma.progressEvent.findFirst({
      where,
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    });

    return NextResponse.json({ 
      ok: true, 
      niche,
      totalCompletedInNiche,
      lastCompletedAt: lastEvent?.createdAt?.toISOString() || null,
    });
  } catch (err: any) {
    console.error("❌ progress/summary route error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Failed to get progress summary" },
      { status: 500 }
    );
  }
}


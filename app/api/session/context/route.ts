import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { whopsdk } from "@/lib/whop-sdk";
import { prisma } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const { userId } = await whopsdk.verifyUserToken(await headers());

    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ error: "Missing body" }, { status: 400 });

    const {
      nicheKey,
      niche,
      customNiche,
      struggle,
      objective,
      practice_preference,
    } = body as {
      nicheKey: string;
      niche?: string;
      customNiche?: string | null;
      struggle?: string | null;
      objective?: string | null;
      practice_preference?: string | null;
    };

    if (!nicheKey) {
      return NextResponse.json({ error: "Missing nicheKey" }, { status: 400 });
    }

    // Load existing session or create new one
    const existing = await prisma.practiceSession.findUnique({
      where: { whopUserId_nicheKey: { whopUserId: userId, nicheKey } },
    });

    const existingData = (existing?.data as any) ?? {};

    // Build updated data object, preserving existing fields
    const updatedData = {
      ...existingData,
      struggle: struggle !== undefined ? struggle : existingData.struggle,
      objective: objective !== undefined ? objective : existingData.objective,
      practice_preference:
        practice_preference !== undefined
          ? practice_preference
          : existingData.practice_preference,
    };

    // Upsert the session with updated context
    await prisma.practiceSession.upsert({
      where: { whopUserId_nicheKey: { whopUserId: userId, nicheKey } },
      update: { data: updatedData },
      create: {
        whopUserId: userId,
        nicheKey,
        data: updatedData,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("POST /api/session/context error:", e);
    return NextResponse.json(
      { error: e?.message ?? "Failed to save session context" },
      { status: 500 }
    );
  }
}





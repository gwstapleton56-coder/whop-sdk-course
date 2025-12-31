import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { whopsdk } from "@/lib/whop-sdk";
import { prisma } from "@/lib/db";

type ResetMode = "KEEP_NICHE" | "CHANGE_NICHE";

export async function POST(req: Request) {
  try {
    const { userId } = await whopsdk.verifyUserToken(await headers());

    const body = (await req.json().catch(() => null)) as
      | { experienceId?: string; mode?: ResetMode }
      | null;

    const experienceId = body?.experienceId;
    const mode = body?.mode;

    if (!experienceId) {
      return NextResponse.json({ error: "Missing experienceId" }, { status: 400 });
    }
    if (mode !== "KEEP_NICHE" && mode !== "CHANGE_NICHE") {
      return NextResponse.json({ error: "Invalid mode" }, { status: 400 });
    }

    // ✅ Reset the session (delete all sessions for this user)
    // Note: PracticeSession is keyed by whopUserId + nicheKey, so we delete all for the user
    await prisma.practiceSession.deleteMany({
      where: { whopUserId: userId },
    });

    // Optional: also clear niche if requested
    if (mode === "CHANGE_NICHE") {
      await prisma.userProfile.update({
        where: { whopUserId: userId },
        data: { primaryNiche: null, customNiche: null },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("session/reset error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to reset session" },
      { status: 500 }
    );
  }
}





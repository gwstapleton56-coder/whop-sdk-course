import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { whopsdk } from "@/lib/whop-sdk";
import { prisma } from "@/lib/db";

function getKeyFromUrl(url: string) {
  const { searchParams } = new URL(url);
  const nicheKey = searchParams.get("nicheKey");
  if (!nicheKey) throw new Error("Missing nicheKey");
  return nicheKey;
}

// GET /api/session?nicheKey=TRADING
export async function GET(request: Request) {
  try {
    const headerList = await headers();
    const { userId } = await whopsdk.verifyUserToken(headerList);
    const nicheKey = getKeyFromUrl(request.url);

    // Verify practiceSession model exists
    if (!prisma.practiceSession) {
      const availableModels = Object.keys(prisma).filter(key => !key.startsWith('$') && !key.startsWith('_'));
      console.error("prisma.practiceSession is undefined.");
      console.error("Available Prisma models:", availableModels);
      throw new Error("PracticeSession model not found in Prisma client. Try: npx prisma generate and restart the dev server.");
    }

    const row = await prisma.practiceSession.findUnique({
      where: { whopUserId_nicheKey: { whopUserId: userId, nicheKey } },
    });

    return NextResponse.json({
      ok: true,
      data: row?.data ?? null,
      updatedAt: row?.updatedAt ? row.updatedAt.toISOString() : null,
      lastCompletionSummary: row?.lastCompletionSummary ?? null,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Failed" }, { status: 400 });
  }
}

// POST /api/session  { nicheKey, data }
export async function POST(request: Request) {
  try {
    const headerList = await headers();
    const { userId } = await whopsdk.verifyUserToken(headerList);

    const body = await request.json();
    const nicheKey = typeof body?.nicheKey === "string" ? body.nicheKey : null;
    const data = body?.data;

    if (!nicheKey) {
      return NextResponse.json({ error: "Missing nicheKey" }, { status: 400 });
    }

    // Verify prisma client is initialized
    if (!prisma) {
      throw new Error("Prisma client not initialized");
    }

    // Verify practiceSession model exists
    if (!prisma.practiceSession) {
      const availableModels = Object.keys(prisma).filter(key => !key.startsWith('$') && !key.startsWith('_'));
      console.error("prisma.practiceSession is undefined.");
      console.error("Available Prisma models:", availableModels);
      console.error("This usually means the Prisma client needs to be regenerated or the dev server needs to be restarted.");
      throw new Error("PracticeSession model not found in Prisma client. Try: npx prisma generate and restart the dev server.");
    }

    const saved = await prisma.practiceSession.upsert({
      where: { whopUserId_nicheKey: { whopUserId: userId, nicheKey } },
      update: { data },
      create: { whopUserId: userId, nicheKey, data },
    });

    return NextResponse.json({
      ok: true,
      updatedAt: saved.updatedAt.toISOString(),
    });
  } catch (e: any) {
    console.error("POST /api/session error:", e);
    return NextResponse.json(
      { error: e?.message ?? "Failed" },
      { status: 500 },
    );
  }
}


import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { whopsdk } from "@/lib/whop-sdk";
import { prisma } from "@/lib/db";

export const runtime = "nodejs"; // IMPORTANT (Prisma needs node runtime)

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    const message = (body?.message ?? "").toString().trim();
    const experienceId = (body?.experienceId ?? "").toString().trim();
    const niche = (body?.niche ?? "").toString().trim();

    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }
    if (!experienceId) {
      return NextResponse.json({ error: "experienceId is required" }, { status: 400 });
    }

    // user must be logged in via whop iframe/proxy
    const headerList = await headers();
    let userId: string;
    try {
      const authResult = await whopsdk.verifyUserToken(headerList);
      userId = authResult.userId;
    } catch (authError: any) {
      console.error("[support] Auth failed:", authError?.message || authError);
      return NextResponse.json(
        { error: "UNAUTHORIZED", message: "Missing or invalid Whop auth context", details: authError?.message },
        { status: 403 }
      );
    }

    await prisma.supportTicket.create({
      data: {
        whopUserId: userId,
        experienceId,
        niche: niche || null,
        message,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    // Return the actual reason so you can see it in the browser console
    return NextResponse.json(
      { error: "Failed to create support ticket", details: e?.message || String(e) },
      { status: 500 }
    );
  }
}


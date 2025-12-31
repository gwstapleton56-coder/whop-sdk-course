import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { whopsdk } from "@/lib/whop-sdk";
import { prisma } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const headerList = await headers();
    const { userId } = await whopsdk.verifyUserToken(headerList);

    const body = await req.json();
    const customNiche = String(body?.customNiche ?? "").trim();

    if (!customNiche) {
      return NextResponse.json({ error: "Missing customNiche" }, { status: 400 });
    }

    await prisma.userProfile.upsert({
      where: { whopUserId: userId },
      create: { whopUserId: userId, customNiche, primaryNiche: "CUSTOM" as any },
      update: { customNiche, primaryNiche: "CUSTOM" as any },
    });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("Error saving custom niche:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to save custom niche" },
      { status: 500 }
    );
  }
}




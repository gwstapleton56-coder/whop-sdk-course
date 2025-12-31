import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { whopsdk } from "@/lib/whop-sdk";
import { prisma } from "@/lib/db";

function norm(s: unknown) {
  return String(s ?? "").trim();
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ experienceId: string }> }
) {
  try {
    const { experienceId } = await params;

    const headerList = await headers();
    const { userId } = await whopsdk.verifyUserToken(headerList);

    const url = new URL(req.url);
    const nicheKey = norm(url.searchParams.get("nicheKey"));
    const customNiche = norm(url.searchParams.get("customNiche")) || "";

    if (!nicheKey) {
      return NextResponse.json({ error: "nicheKey required" }, { status: 400 });
    }

    // @ts-ignore
    const profile = await (prisma as any).userNicheProfile.findUnique({
      where: {
        experienceId_whopUserId_nicheKey_customNiche: {
          experienceId,
          whopUserId: userId,
          nicheKey,
          customNiche,
        },
      },
    });

    return NextResponse.json({ profile: profile ?? null });
  } catch (e: any) {
    console.error("niche-profile GET error:", e);
    return NextResponse.json(
      { error: "niche-profile GET failed", details: String(e?.message || e) },
      { status: 500 }
    );
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ experienceId: string }> }
) {
  try {
    const { experienceId } = await params;

    const headerList = await headers();
    const { userId } = await whopsdk.verifyUserToken(headerList);

    const body = await req.json().catch(() => null);

    const nicheKey = norm(body?.nicheKey);
    const customNiche = norm(body?.customNiche) || "";
    const patch = body?.patch ?? {};

    if (!nicheKey) {
      return NextResponse.json({ error: "nicheKey required" }, { status: 400 });
    }

    const data: any = {};
    if (patch.state !== undefined) data.state = norm(patch.state) || null;
    if (patch.country !== undefined) data.country = norm(patch.country) || null;
    if (patch.testType !== undefined) data.testType = norm(patch.testType) || null;

    // @ts-ignore
    const profile = await (prisma as any).userNicheProfile.upsert({
      where: {
        experienceId_whopUserId_nicheKey_customNiche: {
          experienceId,
          whopUserId: userId,
          nicheKey,
          customNiche,
        },
      },
      update: data,
      create: {
        experienceId,
        whopUserId: userId,
        nicheKey,
        customNiche,
        ...data,
      },
    });

    return NextResponse.json({ profile });
  } catch (e: any) {
    console.error("niche-profile POST error:", e);
    return NextResponse.json(
      { error: "niche-profile POST failed", details: String(e?.message || e) },
      { status: 500 }
    );
  }
}

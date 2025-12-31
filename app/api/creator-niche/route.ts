import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/db";
import { whopsdk } from "@/lib/whop-sdk";
import { isCreatorOrAdmin } from "@/lib/access";
import { Niche } from "@prisma/client";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const experienceId = searchParams.get("experienceId");
    const niche = searchParams.get("niche") as Niche | null;

    if (!experienceId || !niche) {
      return NextResponse.json({ error: "Missing experienceId or niche" }, { status: 400 });
    }

    // @ts-ignore - Prisma types may not be fully updated yet
    const row = await prisma.creatorNicheContext.findUnique({
      where: { experienceId_niche: { experienceId, niche } },
    });

    return NextResponse.json({ ok: true, settings: row ?? null });
  } catch (err: any) {
    console.error("creator-niche GET error:", err);
    return NextResponse.json({ error: err?.message || "Failed" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { userId } = await whopsdk.verifyUserToken(await headers());
    const body = await req.json().catch(() => null);

    const experienceId = body?.experienceId as string | undefined;
    const niche = body?.niche as Niche | undefined;
    const label = (body?.label ?? "").toString();
    const context = (body?.context ?? "").toString();

    if (!experienceId || !niche) {
      return NextResponse.json({ error: "Missing experienceId or niche" }, { status: 400 });
    }

    // ✅ Ensure the requester is a creator/admin in that experience
    const access = await whopsdk.users.checkAccess(experienceId, { id: userId });
    if (!isCreatorOrAdmin(access)) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    // @ts-ignore - Prisma types may not be fully updated yet
    const saved = await prisma.creatorNicheContext.upsert({
      where: { experienceId_niche: { experienceId, niche } },
      update: { label: label.trim() || null, context: context.trim() || null },
      create: { experienceId, niche, label: label.trim() || null, context: context.trim() || null },
    });

    return NextResponse.json({ ok: true, settings: saved });
  } catch (err: any) {
    console.error("creator-niche POST error:", err);
    return NextResponse.json({ error: err?.message || "Failed" }, { status: 500 });
  }
}


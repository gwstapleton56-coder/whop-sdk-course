import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/db";
import { whopsdk } from "@/lib/whop-sdk";
import { isCreatorOrAdmin } from "@/lib/access";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const experienceId = searchParams.get("experienceId");

    if (!experienceId) {
      return NextResponse.json({ error: "Missing experienceId" }, { status: 400 });
    }

    const headerList = await headers();
    const { userId } = await whopsdk.verifyUserToken(headerList);
    const access = await whopsdk.users.checkAccess(experienceId, { id: userId });
    
    if (!isCreatorOrAdmin(access)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const presets = await prisma.nichePreset.findMany({
      where: { experienceId },
      orderBy: { sortOrder: "asc" },
    });

    return NextResponse.json({ ok: true, presets });
  } catch (err: any) {
    console.error("admin/niches GET error:", err);
    return NextResponse.json({ error: err?.message || "Failed" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const experienceId = body?.experienceId as string | undefined;
    const preset = body?.preset as any;

    if (!experienceId || !preset?.key || !preset?.label) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const headerList = await headers();
    const { userId } = await whopsdk.verifyUserToken(headerList);
    const access = await whopsdk.users.checkAccess(experienceId, { id: userId });
    
    if (!isCreatorOrAdmin(access)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Prevent reserved key
    if (preset.key === "custom") {
      return NextResponse.json({ error: "custom is reserved" }, { status: 400 });
    }

    const saved = await prisma.nichePreset.upsert({
      where: { experienceId_key: { experienceId, key: preset.key } },
      update: {
        label: preset.label,
        aiContext: preset.aiContext ?? null,
        enabled: preset.enabled ?? true,
        sortOrder: preset.sortOrder ?? 0,
      },
      create: {
        experienceId,
        key: preset.key,
        label: preset.label,
        aiContext: preset.aiContext ?? null,
        enabled: preset.enabled ?? true,
        sortOrder: preset.sortOrder ?? 0,
      },
    });

    return NextResponse.json({ ok: true, preset: saved });
  } catch (err: any) {
    console.error("admin/niches POST error:", err);
    return NextResponse.json({ error: err?.message || "Failed" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const experienceId = body?.experienceId as string | undefined;
    const key = body?.key as string | undefined;

    if (!experienceId || !key) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }
    
    if (key === "custom") {
      return NextResponse.json({ error: "custom is reserved" }, { status: 400 });
    }

    const headerList = await headers();
    const { userId } = await whopsdk.verifyUserToken(headerList);
    const access = await whopsdk.users.checkAccess(experienceId, { id: userId });
    
    if (!isCreatorOrAdmin(access)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.nichePreset.delete({
      where: { experienceId_key: { experienceId, key } },
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("admin/niches DELETE error:", err);
    return NextResponse.json({ error: err?.message || "Failed" }, { status: 500 });
  }
}


import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ALWAYS_CUSTOM_PRESET } from "@/lib/niches";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const experienceId = searchParams.get("experienceId");

    if (!experienceId) {
      return NextResponse.json({ error: "Missing experienceId" }, { status: 400 });
    }

    const presets = await prisma.nichePreset.findMany({
      where: { experienceId, enabled: true },
      orderBy: { sortOrder: "asc" },
      select: { key: true, label: true, aiContext: true, sortOrder: true, icon: true },
    });

    return NextResponse.json({
      ok: true,
      presets: [
        ...presets.map((p: any) => ({
          key: p.key,
          label: p.label,
          aiContext: p.aiContext,
          sortOrder: p.sortOrder,
          icon: p.icon || null,
        })),
        ALWAYS_CUSTOM_PRESET,
      ],
    });
  } catch (err: any) {
    console.error("niches GET error:", err);
    return NextResponse.json({ error: err?.message || "Failed" }, { status: 500 });
  }
}


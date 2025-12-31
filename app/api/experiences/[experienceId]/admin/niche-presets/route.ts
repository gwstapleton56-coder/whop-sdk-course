import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { whopsdk } from "@/lib/whop-sdk";
import { prisma } from "@/lib/db";
import { isOwner } from "@/lib/access";
import { slugifyKey } from "@/lib/slug";
import { suggestIconForNiche } from "@/lib/niche-icon";

async function assertOwner(experienceId: string) {
  const headerList = await headers();
  const { userId } = await whopsdk.verifyUserToken(headerList);
  const access = await whopsdk.users.checkAccess(experienceId, { id: userId });
  if (!isOwner(access)) {
    return { ok: false as const };
  }
  return { ok: true as const };
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ experienceId: string }> }
) {
  const { experienceId } = await params;
  const guard = await assertOwner(experienceId);
  if (!guard.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const presets = await (prisma as any).nichePreset.findMany({
    where: { experienceId },
    orderBy: { sortOrder: "asc" },
  });

  return NextResponse.json({ presets });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ experienceId: string }> }
) {
  try {
    const { experienceId } = await params;
    const guard = await assertOwner(experienceId);
    if (!guard.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ error: "Invalid request body" }, { status: 400 });

    const rawKey = body?.key ?? body?.label ?? "";
    const key = slugifyKey(rawKey);
    const label = (body?.label || rawKey || "").trim();
    const aiContext = (body?.aiContext ?? "").trim();
    // Auto-suggest icon if not provided
    const iconFromBody = (body?.icon ?? "").trim();
    const suggestedIcon = iconFromBody || suggestIconForNiche(label, key);
    const enabled = body?.enabled ?? true;

    if (!key) return NextResponse.json({ error: "key required" }, { status: 400 });
    if (key === "custom") return NextResponse.json({ error: "custom is reserved" }, { status: 400 });
    if (!label) return NextResponse.json({ error: "label required" }, { status: 400 });

    // find max sortOrder
    const max = await (prisma as any).nichePreset.aggregate({
      where: { experienceId },
      _max: { sortOrder: true },
    });

    const sortOrder = (max._max.sortOrder ?? 0) + 1;

    // Build create/update data without icon first (in case migration not applied)
    const baseData = {
      experienceId,
      key,
      label,
      aiContext: aiContext || null,
      enabled,
    };

    // Try to include icon, but handle if field doesn't exist yet
    let preset;
    try {
      preset = await (prisma as any).nichePreset.upsert({
        where: { experienceId_key: { experienceId, key } },
        update: { ...baseData, icon: suggestedIcon },
        create: {
          ...baseData,
          icon: suggestedIcon,
          sortOrder,
        },
      });
    } catch (error: any) {
      // If icon field doesn't exist or any column error, try without it
      const errorMsg = error?.message?.toLowerCase() || "";
      const isColumnError = 
        errorMsg.includes("icon") || 
        errorMsg.includes("unknown column") ||
        errorMsg.includes("column") ||
        error?.code === "P2009" ||
        error?.code === "P2011";
      
      if (isColumnError) {
        console.log("[ADMIN] Column error detected, creating without icon:", error?.message);
        preset = await (prisma as any).nichePreset.upsert({
          where: { experienceId_key: { experienceId, key } },
          update: baseData,
          create: {
            ...baseData,
            sortOrder,
          },
        });
      } else {
        // Re-throw other errors
        console.error("[ADMIN] Unexpected error creating preset:", error);
        throw error;
      }
    }

    // Revalidate the home page to show new presets immediately
    revalidatePath(`/experiences/${experienceId}/home`);

    return NextResponse.json({ preset });
  } catch (error: any) {
    console.error("[ADMIN] Error creating preset:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to create preset", details: error?.toString() },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ experienceId: string }> }
) {
  const { experienceId } = await params;
  const guard = await assertOwner(experienceId);
  if (!guard.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const key = (url.searchParams.get("key") ?? "").trim().toLowerCase();

  if (!key) return NextResponse.json({ error: "key required" }, { status: 400 });
  if (key === "custom") return NextResponse.json({ error: "custom cannot be deleted" }, { status: 400 });

  // HARD delete so creator can fully replace presets
  await (prisma as any).nichePreset.delete({
    where: { experienceId_key: { experienceId, key } },
  });

  // Creator is taking control; do not auto-reseed defaults anymore
  await (prisma as any).creatorSettings.upsert({
    where: { experienceId },
    update: { allowAutoDefaults: false },
    create: { experienceId, allowAutoDefaults: false },
  });

  // Revalidate the home page to reflect deleted presets
  revalidatePath(`/experiences/${experienceId}/home`);

  return NextResponse.json({ ok: true });
}


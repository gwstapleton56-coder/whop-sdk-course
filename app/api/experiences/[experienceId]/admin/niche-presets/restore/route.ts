import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { whopsdk } from "@/lib/whop-sdk";
import { prisma } from "@/lib/db";
import { isCreatorOrAdmin } from "@/lib/access";

const WHOP_DEFAULT_PRESETS = [
  { key: "trading", label: "Trading & Investing" },
  { key: "sports_betting", label: "Sports Betting" },
  { key: "social_media", label: "Social Media & Clipping" },
  { key: "reselling_ecommerce", label: "Reselling & Ecommerce" },
  { key: "fitness_health", label: "Fitness & Health" },
];

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ experienceId: string }> }
) {
  const { experienceId } = await params;

  const headerList = await headers();
  const { userId } = await whopsdk.verifyUserToken(headerList);
  const access = await whopsdk.users.checkAccess(experienceId, { id: userId });

  if (!isCreatorOrAdmin(access)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Replace ALL presets with Whop defaults (Custom is NOT stored in DB)
  await prisma.$transaction([
    // @ts-ignore
    (prisma as any).nichePreset.deleteMany({ where: { experienceId } }),
    // @ts-ignore
    (prisma as any).nichePreset.createMany({
      data: WHOP_DEFAULT_PRESETS.map((p, idx) => ({
        experienceId,
        key: p.key,
        label: p.label,
        aiContext: null,
        enabled: true,
        sortOrder: idx,
      })),
      skipDuplicates: true,
    }),
  ]);

  return NextResponse.json({ ok: true });
}





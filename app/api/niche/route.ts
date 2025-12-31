import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { whopsdk } from "@/lib/whop-sdk";
import { prisma } from "@/lib/db";

function normalizeKey(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_-]/g, "");
}

export async function POST(request: Request) {
  try {
    const headerList = await headers();
    const { userId } = await whopsdk.verifyUserToken(headerList);

    const body = await request.json().catch(() => ({}));
    const nicheRaw = body?.niche ?? body?.nicheKey ?? "";
    const customRaw = body?.customNiche;

    const nicheKey = normalizeKey(String(nicheRaw));
    const customNiche =
      typeof customRaw === "string" ? customRaw.trim() : null;

    if (!nicheKey) {
      return NextResponse.json({ error: "Missing niche" }, { status: 400 });
    }

    // ✅ Always allow "custom"
    if (nicheKey !== "custom") {
      // ✅ Allow any enabled preset for ANY experience (since this route doesn't have experienceId)
      // We check if the preset exists globally since user may switch experiences
      const preset = await (prisma as any).nichePreset.findFirst({
        where: { key: nicheKey, enabled: true },
        select: { key: true },
      });

      if (!preset) {
        return NextResponse.json(
          { error: `Invalid niche value: ${nicheKey}` },
          { status: 400 }
        );
      }
    }

    // Build update/create payload
    // Store the nicheKey as customNiche field for new key-based system
    // We still use primaryNiche for legacy enum values
    const isLegacyEnum = ["trading", "sports", "social_media", "reselling", "fitness"].includes(nicheKey);
    
    const data: any = {
      customNiche: nicheKey === "custom" ? customNiche : null,
    };

    if (isLegacyEnum) {
      // Map to legacy enum for backwards compatibility
      const keyToEnum: Record<string, string> = {
        trading: "TRADING",
        sports: "SPORTS",
        social_media: "SOCIAL_MEDIA",
        reselling: "RESELLING",
        fitness: "FITNESS",
      };
      data.primaryNiche = keyToEnum[nicheKey];
    } else if (nicheKey === "custom") {
      data.primaryNiche = "CUSTOM";
      if (!customNiche) {
        return NextResponse.json(
          { error: "Custom niche description required when niche=custom" },
          { status: 400 }
        );
      }
    } else {
      // New preset key - store as CUSTOM with the key in customNiche
      data.primaryNiche = "CUSTOM";
      data.customNiche = nicheKey;
    }

    await prisma.userProfile.upsert({
      where: { whopUserId: userId },
      update: data,
      create: {
        whopUserId: userId,
        ...data,
      },
    });

    return NextResponse.json({ ok: true, niche: nicheKey });
  } catch (error: any) {
    console.error("Error in /api/niche:", error);
    return NextResponse.json(
      { error: error?.message ?? "Internal server error" },
      { status: 500 }
    );
  }
}

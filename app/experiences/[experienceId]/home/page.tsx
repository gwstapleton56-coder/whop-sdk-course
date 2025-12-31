import { headers } from "next/headers";
import { whopsdk } from "@/lib/whop-sdk";
import { prisma } from "@/lib/db";
import { seedWhopDefaultsIfAllowed } from "@/lib/niche-defaults";
import HomeClient from "./_components/home-client";

// Force dynamic rendering to prevent caching
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function HomePage({
  params,
}: {
  params: Promise<{ experienceId: string }>;
}) {
  const { experienceId } = await params;

  const headerList = await headers();
  const { userId } = await whopsdk.verifyUserToken(headerList);

  // Seed defaults if needed
  await seedWhopDefaultsIfAllowed(experienceId);

  // Debug logging (dev only)
  if (process.env.NODE_ENV !== "production") {
    console.log("[HOME] experienceId:", experienceId);
    const all = await (prisma as any).nichePreset.count({ where: { experienceId } });
    const enabled = await (prisma as any).nichePreset.count({ where: { experienceId, enabled: true } });
    console.log("[HOME] presets all:", all, "enabled:", enabled);
    
    const allPresets = await (prisma as any).nichePreset.findMany({
      where: { experienceId },
      orderBy: { sortOrder: "asc" },
    });
    console.log("[DEBUG] presets:", allPresets.map((p: any) => ({
      key: p.key,
      label: p.label,
      enabled: p.enabled,
    })));
  }

  const [presetsRaw, profile, user] = await Promise.all([
    (prisma as any).nichePreset.findMany({
      where: { experienceId, enabled: true },
      orderBy: { sortOrder: "asc" },
      select: { key: true, label: true, enabled: true, icon: true },
    }),
    prisma.userProfile.findUnique({ where: { whopUserId: userId } }),
    whopsdk.users.retrieve(userId),
  ]);
  
  // Map presets and include icon if available (after migration is applied)
  const presets = presetsRaw.map((p: any) => ({
    key: p.key,
    label: p.label,
    enabled: p.enabled,
    icon: p.icon || null, // Will be null until migration is applied
  }));

  // Last used niche (best-effort)
  const lastKey =
    (profile as any)?.lastNicheKey ||
    ((profile as any)?.primaryNiche === "CUSTOM" ? "custom" : null);

  // Get display name from user
  const displayName = user.name || `@${user.username}`;

  return <HomeClient experienceId={experienceId} presets={presets} lastKey={lastKey} displayName={displayName} />;
}


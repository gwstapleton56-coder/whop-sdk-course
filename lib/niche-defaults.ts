import { prisma } from "@/lib/db";

const WHOP_DEFAULT_PRESETS = [
  { key: "trading_investing", label: "Trading & Investing" },
  { key: "sports_betting", label: "Sports Betting" },
  { key: "social_media", label: "Social Media & Clipping" },
  { key: "reselling_ecommerce", label: "Reselling & Ecommerce" },
  { key: "fitness_health", label: "Fitness & Health" },
  { key: "airbnb", label: "Airbnb" },
];

export async function seedWhopDefaultsIfAllowed(experienceId: string) {
  const settings = await (prisma as any).creatorSettings.upsert({
    where: { experienceId },
    update: {},
    create: { experienceId, allowAutoDefaults: true },
  });

  // If creator has opted out, do nothing
  if (!settings.allowAutoDefaults) return;

  const count = await (prisma as any).nichePreset.count({ where: { experienceId } });
  // Seed if count is small (ex: only 1 "custom" row exists, or no presets at all)
  // This fixes the issue where seeding "runs" but inserts nothing because count > 0
  if (count >= 5) return;

  // Seed defaults
  await (prisma as any).nichePreset.createMany({
    data: WHOP_DEFAULT_PRESETS.map((p, i) => ({
      experienceId,
      key: p.key,
      label: p.label,
      enabled: true,
      sortOrder: i,
      aiContext: null,
    })),
    skipDuplicates: true,
  });
}



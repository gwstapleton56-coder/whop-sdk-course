import { prisma } from "@/lib/db";
import { ALWAYS_CUSTOM_PRESET } from "@/lib/niches";

/**
 * Validates and fixes a user's nicheKey if it no longer exists.
 * Returns the valid nicheKey and whether it was changed.
 */
export async function validateNicheKey(args: {
  experienceId: string;
  nicheKey: string | null;
}): Promise<{ nicheKey: string; wasChanged: boolean; message?: string }> {
  const { experienceId, nicheKey } = args;

  // If no nicheKey, default to custom
  if (!nicheKey) {
    return { nicheKey: "custom", wasChanged: true };
  }

  // Normalize old "CUSTOM:" prefix to "custom"
  const normalizedKey = nicheKey.replace(/^CUSTOM:/i, "custom").toLowerCase();

  // Custom is always valid
  if (normalizedKey === "custom") {
    return { nicheKey: "custom", wasChanged: normalizedKey !== nicheKey };
  }

  // Check if preset exists and is enabled
  const preset = await prisma.nichePreset.findUnique({
    where: { experienceId_key: { experienceId, key: normalizedKey } },
  }).catch(() => null);

  if (preset && preset.enabled) {
    return { nicheKey: normalizedKey, wasChanged: normalizedKey !== nicheKey };
  }

  // Preset doesn't exist or is disabled - fallback to first enabled preset or custom
  const presets = await prisma.nichePreset.findMany({
    where: { experienceId, enabled: true },
    orderBy: { sortOrder: "asc" },
  }).catch(() => []);

  const fallbackKey = presets.length > 0 ? presets[0].key : "custom";
  const fallbackLabel = presets.length > 0 ? presets[0].label : "Custom";

  return {
    nicheKey: fallbackKey,
    wasChanged: true,
    message: `Creator updated niches — moved you to ${fallbackLabel}`,
  };
}


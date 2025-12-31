import { prisma } from "@/lib/db";
import { ALWAYS_CUSTOM_PRESET } from "@/lib/niches";

/**
 * Get AI context for a niche, combining:
 * - CreatorSettings.globalContext (creator-wide context)
 * - NichePreset.aiContext (preset-specific context)
 * - Custom niche text (if nicheKey === "custom")
 */
export async function getNicheContext(args: {
  experienceId: string;
  nicheKey: string;
  customNiche?: string | null;
}) {
  const { experienceId, nicheKey, customNiche } = args;

  // Load creator global context
  const creatorSettings = await prisma.creatorSettings.findUnique({
    where: { experienceId },
  }).catch(() => null);

  const globalContext = creatorSettings?.globalContext ?? null;

  // Load preset (or use ALWAYS_CUSTOM_PRESET)
  let preset = {
    key: ALWAYS_CUSTOM_PRESET.key,
    label: ALWAYS_CUSTOM_PRESET.label,
    aiContext: ALWAYS_CUSTOM_PRESET.aiContext as string | null,
    isEnabled: ALWAYS_CUSTOM_PRESET.isEnabled,
    sortOrder: ALWAYS_CUSTOM_PRESET.sortOrder,
  };
  if (nicheKey !== "custom") {
    const found = await prisma.nichePreset.findUnique({
      where: { experienceId_key: { experienceId, key: nicheKey } },
    }).catch(() => null);
    
    if (found && found.enabled) {
      preset = {
        key: found.key,
        label: found.label,
        aiContext: found.aiContext,
        isEnabled: found.enabled,
        sortOrder: found.sortOrder,
      };
    }
  }

  // Build context blocks
  const contextParts: string[] = [];

  if (globalContext) {
    contextParts.push(`Creator global context: ${globalContext}`);
  }

  if (preset.aiContext) {
    contextParts.push(`Niche context (${preset.label}): ${preset.aiContext}`);
  }

  if (nicheKey === "custom" && customNiche) {
    contextParts.push(`User niche: ${customNiche.trim()}`);
  }

  const fullContext = contextParts.length > 0
    ? contextParts.join("\n\n")
    : "Use practical examples and focused training drills.";

  return {
    label: preset.label,
    context: fullContext,
    preset,
  };
}


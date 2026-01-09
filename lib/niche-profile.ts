import { prisma } from "@/lib/db";
import type { Niche } from "@prisma/client";

const DEFAULT_NICHE_PROFILES: Record<string, { label: string; context: string }> = {
  TRADING: {
    label: "Trading",
    context:
      "Focus on execution, risk management, discipline, psychology, and scenario-based decision making. Use realistic market/trade examples.",
  },
  SPORTS: {
    label: "Sports Betting",
    context:
      "Focus on bankroll management, value betting, discipline, research, and scenario-based decision making. Use realistic betting examples.",
  },
  SOCIAL_MEDIA: {
    label: "Social Media & Clipping",
    context:
      "Focus on content creation, engagement strategies, consistency, platform-specific tactics, and practical scenarios. Use realistic content examples.",
  },
  RESELLING: {
    label: "Reselling & Ecommerce",
    context:
      "Focus on sourcing, pricing, listing optimization, customer service, and profit margins. Use realistic marketplace scenarios.",
  },
  FITNESS: {
    label: "Fitness",
    context:
      "Focus on form cues, progressive overload, recovery, consistency, and practical scenarios. Keep guidance actionable.",
  },
  CUSTOM: {
    label: "Custom",
    context:
      "Adapt to the user-provided niche and keep examples aligned with that niche. Ask clarifying questions when needed.",
  },
};

export async function getNicheProfile(args: {
  experienceId: string;
  niche: Niche;
  customNiche?: string | null;
}) {
  const { experienceId, niche, customNiche } = args;

  // @ts-ignore - Prisma types may not be fully updated yet
  const override = await prisma.creatorNicheContext.findUnique({
    where: { experienceId_niche: { experienceId, niche } },
  }).catch(() => null);

  const base = DEFAULT_NICHE_PROFILES[niche] ?? {
    label: niche,
    context: "Use practical examples and focused training drills.",
  };

  // What members see as "Niche: …"
  const label =
    niche === "CUSTOM"
      ? (customNiche ?? "").trim() || (override?.label ?? base.label)
      : (override?.label ?? base.label);

  // What the AI reasons from
  const context =
    niche === "CUSTOM"
      ? [
          override?.context ?? base.context,
          customNiche ? `User niche: ${customNiche.trim()}` : null,
        ]
          .filter(Boolean)
          .join("\n")
      : (override?.context ?? base.context);

  return { label, context };
}






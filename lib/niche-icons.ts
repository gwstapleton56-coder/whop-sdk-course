import {
  TrendingUp,
  Trophy,
  Scissors,
  ShoppingBag,
  Dumbbell,
  Sparkles,
  Home,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export const NICHE_ICON_MAP: Record<string, LucideIcon> = {
  trading_investing: TrendingUp,
  sports_betting: Trophy,
  social_media: Scissors,
  reselling_ecommerce: ShoppingBag,
  fitness_health: Dumbbell,
  airbnb: Home,
  custom: Sparkles,
};

/**
 * Normalize slug/key to lowercase for consistent lookup
 */
export function normalizeSlug(slug: string): string {
  return slug.trim().toLowerCase();
}

/**
 * Get icon component for a niche slug/key
 * Returns Sparkles as default fallback
 */
export function getNicheIcon(slug: string | null | undefined): LucideIcon {
  if (!slug) return Sparkles;
  const normalized = normalizeSlug(slug);
  return NICHE_ICON_MAP[normalized] ?? Sparkles;
}




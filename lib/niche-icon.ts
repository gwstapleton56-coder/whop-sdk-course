/**
 * Auto-suggests a Lucide icon name based on niche label/keywords
 */
export function suggestIconForNiche(label: string, key?: string): string {
  const text = `${label} ${key || ""}`.toLowerCase();

  // Trading / Investing / Finance
  if (
    text.includes("trade") ||
    text.includes("invest") ||
    text.includes("forex") ||
    text.includes("stock") ||
    text.includes("crypto") ||
    text.includes("finance") ||
    text.includes("trading")
  ) {
    return "TrendingUp";
  }

  // Fitness / Gym / Workout
  if (
    text.includes("fitness") ||
    text.includes("gym") ||
    text.includes("workout") ||
    text.includes("exercise") ||
    text.includes("health") ||
    text.includes("wellness")
  ) {
    return "Dumbbell";
  }

  // Social Media / Content / Clips
  if (
    text.includes("social") ||
    text.includes("clip") ||
    text.includes("content") ||
    text.includes("media") ||
    text.includes("video") ||
    text.includes("youtube") ||
    text.includes("tiktok")
  ) {
    return "Scissors";
  }

  // Reselling / Ecommerce / Shopping
  if (
    text.includes("resell") ||
    text.includes("ecommerce") ||
    text.includes("shop") ||
    text.includes("sell") ||
    text.includes("retail") ||
    text.includes("marketplace")
  ) {
    return "ShoppingBag";
  }

  // Health / Medical
  if (
    text.includes("health") ||
    text.includes("medical") ||
    text.includes("doctor") ||
    text.includes("nurse") ||
    text.includes("therapy")
  ) {
    return "HeartPulse";
  }

  // Default
  return "Sparkles";
}





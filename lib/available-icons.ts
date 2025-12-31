/**
 * Available icons for niche presets
 * These are Lucide icon names that can be used
 */
export const AVAILABLE_ICONS = [
  { value: "TrendingUp", label: "Trending Up", category: "Finance" },
  { value: "Dumbbell", label: "Dumbbell", category: "Fitness" },
  { value: "Scissors", label: "Scissors", category: "Content" },
  { value: "ShoppingBag", label: "Shopping Bag", category: "Commerce" },
  { value: "HeartPulse", label: "Heart Pulse", category: "Health" },
  { value: "Sparkles", label: "Sparkles", category: "General" },
  { value: "Briefcase", label: "Briefcase", category: "Business" },
  { value: "GraduationCap", label: "Graduation Cap", category: "Education" },
  { value: "Code", label: "Code", category: "Tech" },
  { value: "Palette", label: "Palette", category: "Creative" },
  { value: "Music", label: "Music", category: "Entertainment" },
  { value: "Camera", label: "Camera", category: "Media" },
  { value: "Video", label: "Video", category: "Media" },
  { value: "Book", label: "Book", category: "Education" },
  { value: "Gamepad2", label: "Gamepad", category: "Gaming" },
  { value: "Car", label: "Car", category: "Transport" },
  { value: "Home", label: "Home", category: "Real Estate" },
  { value: "UtensilsCrossed", label: "Food", category: "Food" },
  { value: "Plane", label: "Plane", category: "Travel" },
  { value: "Zap", label: "Zap", category: "Energy" },
  { value: "Target", label: "Target", category: "Goals" },
  { value: "Rocket", label: "Rocket", category: "Growth" },
  { value: "TrendingDown", label: "Trending Down", category: "Finance" },
  { value: "DollarSign", label: "Dollar Sign", category: "Finance" },
  { value: "Coins", label: "Coins", category: "Finance" },
] as const;

export type IconValue = typeof AVAILABLE_ICONS[number]["value"];




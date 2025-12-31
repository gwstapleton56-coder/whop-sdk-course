"use client";

import { useMemo, useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  TrendingUp,
  Scissors,
  HeartPulse,
  ShoppingBag,
  Dumbbell,
  Sparkles,
  ArrowRight,
  Play,
  MessageSquare,
  type LucideIcon,
} from "lucide-react";
import { suggestIconForNiche } from "@/lib/niche-icon";
import { OnboardingWelcome } from "@/components/onboarding/OnboardingWelcome";

type Preset = { key: string; label: string; enabled: boolean; icon?: string | null };

const iconMap: Record<string, LucideIcon> = {
  TrendingUp,
  Scissors,
  HeartPulse,
  ShoppingBag,
  Dumbbell,
  Sparkles,
};

function NicheIcon({ nicheKey, label, icon }: { nicheKey: string; label: string; icon?: string | null }) {
  // Use stored icon if available, otherwise auto-suggest
  const iconName = icon || suggestIconForNiche(label, nicheKey);
  const IconComponent = iconMap[iconName] || Sparkles;
  
  return <IconComponent className="h-5 w-5 text-gray-11" />;
}

export default function HomeClient({
  experienceId,
  presets,
  lastKey: serverLastKey,
  displayName,
}: {
  experienceId: string;
  presets: Preset[];
  lastKey: string | null;
  displayName?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [localLastNiche, setLocalLastNiche] = useState<{ id: string; name: string; timestamp: number } | null>(null);

  // Helper function to load recent niche from localStorage
  const loadRecentNiche = () => {
    try {
      const stored = localStorage.getItem("lastPracticedNiche");
      if (stored) {
        const parsed = JSON.parse(stored);
        console.log("[RECENT] loading", { experienceId, recent: parsed, pathname });
        setLocalLastNiche(parsed);
        return parsed;
      }
    } catch (e) {
      console.error("Failed to read lastPracticedNiche from localStorage:", e);
    }
    return null;
  };

  // Read last practiced niche from localStorage on mount and when pathname changes
  useEffect(() => {
    loadRecentNiche();
  }, [experienceId, pathname]);

  // Also reload when the tab becomes visible (covers "back" + iOS weirdness)
  useEffect(() => {
    const onFocus = () => {
      console.log("[HOME] Window focused, reloading recent niche");
      loadRecentNiche();
    };
    const onVis = () => {
      if (document.visibilityState === "visible") {
        console.log("[HOME] Tab became visible, reloading recent niche");
        loadRecentNiche();
      }
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVis);

    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [experienceId]);

  // Normalize keys to lowercase for consistent comparison
  const normalizedLocalKey = localLastNiche?.id?.toLowerCase().trim();
  const normalizedServerKey = serverLastKey?.toLowerCase().trim() || null;
  
  // Use localStorage value if available, otherwise fall back to server value
  const lastKey = normalizedLocalKey || normalizedServerKey;
  
  const cards = useMemo(() => {
    const list = presets.filter((p) => p.enabled !== false);
    const hasCustom = list.some((p) => p.key === "custom");
    return hasCustom ? list : [...list, { key: "custom", label: "Custom", enabled: true }];
  }, [presets]);
  
  // Get the icon for the continue section
  const ContinueIconComponent = useMemo(() => {
    if (!lastKey) return Sparkles;
    try {
      const matchingPreset = presets.find(p => p.key?.toLowerCase() === lastKey?.toLowerCase());
      const nicheLabel = matchingPreset?.label || localLastNiche?.name || "Your niche";
      const nicheIcon = matchingPreset?.icon || suggestIconForNiche(nicheLabel, lastKey);
      const Icon = iconMap[nicheIcon];
      return Icon && typeof Icon === 'function' ? Icon : Sparkles;
    } catch {
      return Sparkles;
    }
  }, [lastKey, presets, localLastNiche]);

  // Debug logging
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      console.log("[HOME] lastKey:", lastKey, "normalizedLocalKey:", normalizedLocalKey, "normalizedServerKey:", normalizedServerKey);
      console.log("[HOME] Preset keys:", cards.map(c => c.key));
    }
  }, [lastKey, normalizedLocalKey, normalizedServerKey, cards]);

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-16">
        {/* Onboarding Welcome - Shows for first-time users */}
        <OnboardingWelcome experienceId={experienceId} />

        {/* Header Section */}
        <div className="mb-10 sm:mb-12">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-12 mb-2 tracking-tight">
                {displayName ? `Welcome back, ${displayName.split(' ')[0]}` : 'Welcome back'}
              </h1>
              <p className="text-3 text-gray-10">
                Choose your focus area to start practicing
              </p>
            </div>
            <button
              type="button"
              onClick={() => router.push(`/experiences/${experienceId}/coach`)}
              className="flex items-center justify-center gap-2 rounded-lg border border-gray-a5 bg-white px-5 py-2.5 text-sm font-medium text-gray-12 hover:bg-gray-a1 hover:border-gray-a6 transition-colors shrink-0"
            >
              <MessageSquare className="h-4 w-4" />
              <span>AI Coach</span>
            </button>
          </div>
        </div>

        {/* Continue Section */}
        {lastKey && (
          <div className="mb-12">
            <button
              type="button"
              onClick={() => router.push(`/experiences/${experienceId}/n/${lastKey}`)}
              className="group w-full rounded-xl border border-blue-a5 bg-blue-a1 p-5 sm:p-6 text-left transition-all duration-200 hover:border-blue-a6 hover:bg-blue-a2 hover:shadow-md"
            >
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg border border-blue-a5 bg-white flex items-center justify-center shrink-0">
                  <Play className="h-5 w-5 text-blue-11" fill="currentColor" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-4 font-semibold text-gray-12 mb-0.5">Continue practice</div>
                  <div className="text-3 text-gray-10">Resume your last niche session</div>
                </div>
                <ArrowRight className="h-5 w-5 text-gray-10 group-hover:text-blue-11 group-hover:translate-x-1 transition-all shrink-0" />
              </div>
            </button>
          </div>
        )}

        {/* Practice Areas Section */}
        <div>
          <div className="mb-6">
            <h2 className="text-3 font-semibold text-gray-12 mb-1">Practice Areas</h2>
            <p className="text-3 text-gray-10">Select a niche to start practicing</p>
          </div>
          
          {/* Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {cards.map((n) => {
              // Normalize card key for comparison (lastKey is already normalized)
              const normalizedCardKey = n.key?.toLowerCase().trim();
              const isRecent = normalizedCardKey === lastKey && lastKey;
              return (
                <button
                  key={n.key}
                  type="button"
                  onClick={() => router.push(`/experiences/${experienceId}/n/${n.key}`)}
                  className="group relative rounded-xl border border-gray-a5 bg-white p-5 text-left transition-all duration-200 hover:border-blue-a5 hover:bg-blue-a1 hover:shadow-md"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-lg border border-gray-a5 bg-gray-a1 flex items-center justify-center shrink-0 transition-colors group-hover:border-blue-a5 group-hover:bg-blue-a2">
                      <NicheIcon nicheKey={n.key} label={n.label} icon={n.icon} />
                    </div>
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <h3 className="text-4 font-semibold text-gray-12 truncate">
                        {n.label}
                      </h3>
                      {isRecent && (
                        <span className="rounded-full bg-blue-a1 border border-blue-a5 px-2 py-0.5 text-2 font-medium text-blue-11 shrink-0 whitespace-nowrap">
                          Recent
                        </span>
                      )}
                    </div>
                    <ArrowRight className="h-4 w-4 text-gray-10 group-hover:text-blue-11 group-hover:translate-x-1 transition-all shrink-0" />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}


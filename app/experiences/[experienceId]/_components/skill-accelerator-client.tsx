"use client";

import { useState } from "react";
import { Button } from "@whop/react/components";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { CheckoutButton } from "./checkout-button";
import { NicheSelector } from "./niche-selector";
import { PracticeArea } from "./practice-area";
import { ResetSessionModal } from "./reset-session-modal";
import { CustomNicheSetup } from "./custom-niche-setup";
import { isCreatorOrAdmin } from "@/lib/access";

type SkillAcceleratorClientProps = {
  experience: any;
  access: any;
  displayName: string;
  experienceId: string;
  initialNiche: string | null;
  initialCustomNiche?: string;
  isCreator?: boolean;
  preview?: string;
  nicheChangeMessage?: string;
  hideInlineNicheSelector?: boolean;
  showDevTools?: boolean;
};

function prettyLabelFromKey(input: string | null): string | null {
  if (!input) return null;
  return input
    .replace(/[_-]+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function getNicheLabel(id: string | null, customNiche: string): string | null {
  switch (id) {
    case "TRADING":
      return "Trading & Investing";
    case "SPORTS":
      return "Sports & Betting";
    case "SOCIAL_MEDIA":
      return "Social Media & Clipping";
    case "RESELLING":
      return "Reselling & Ecommerce";
    case "FITNESS":
      return "Fitness & Health";
    case "CUSTOM":
      return customNiche || "Custom";
    case "custom":
      return customNiche || "Custom";
    default:
      // For creator-defined preset keys (e.g. "growth_operating"),
      // generate a human-friendly label on the fly.
      return prettyLabelFromKey(id);
  }
}

export function SkillAcceleratorClient({
  experience,
  access,
  displayName,
  experienceId,
  initialNiche,
  initialCustomNiche = "",
  isCreator: propIsCreator = false,
  preview,
  nicheChangeMessage,
  hideInlineNicheSelector = false,
  showDevTools = false,
}: SkillAcceleratorClientProps) {
  const [selectedNiche, setSelectedNiche] = useState<string | null>(
    initialNiche,
  );
  const [selectedNicheLabel, setSelectedNicheLabel] = useState<string | null>(
    getNicheLabel(initialNiche, initialCustomNiche),
  );
  const [customNiche, setCustomNiche] = useState(initialCustomNiche);
  const [showNicheChangeMessage, setShowNicheChangeMessage] = useState(!!nicheChangeMessage);

  // Use the stored label directly - no transformation
  const nicheLabel = selectedNicheLabel ?? getNicheLabel(selectedNiche, customNiche);
  const isCreator = propIsCreator;

  // Debug logging for dev tools visibility (dev only)
  if (process.env.NODE_ENV !== "production") {
    console.log("DEVTOOLS", { showDevTools, isCreator, propIsCreator });
  }

  // Check if custom niche needs setup
  const isCustom = selectedNiche?.toLowerCase() === "custom";
  const needsCustomName = isCustom && !customNiche?.trim();
  
  // Use custom niche name as label if it's a custom niche
  const effectiveNicheLabel = isCustom && customNiche ? customNiche : nicheLabel;

  // Handle custom niche setup
  async function handleCustomNicheSave(name: string) {
    try {
      const res = await fetch(`/api/profile/custom-niche`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customNiche: name }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Failed to save custom niche");
      }
      setCustomNiche(name);
      setSelectedNicheLabel(name);
    } catch (error: any) {
      console.error("Failed to save custom niche:", error);
      // Error is handled by the CustomNicheSetup component's internal error state
      console.error("Failed to save custom niche:", error?.message || "Unknown error");
      throw error;
    }
  }

  // Show custom niche setup if needed
  if (needsCustomName) {
    return (
      <div className="flex flex-col gap-6">
        <CustomNicheSetup onSave={handleCustomNicheSave} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {showNicheChangeMessage && nicheChangeMessage && (
          <div className="mt-4 rounded-xl border border-blue-200/60 bg-gradient-to-r from-blue-50/80 to-purple-50/80 backdrop-blur-sm p-4 text-sm text-blue-900 premium-shadow">
            <div className="flex items-start justify-between gap-2">
              <span>{nicheChangeMessage}</span>
              <button
                onClick={() => setShowNicheChangeMessage(false)}
                className="text-blue-700 hover:text-blue-900 transition-colors shrink-0 ml-2"
              >
                ×
              </button>
            </div>
          </div>
      )}

      {showDevTools && (
        <div className="flex flex-wrap gap-3">
          {isCreator ? (
            <div className="flex items-center gap-2">
              <a
                className="rounded-md border border-gray-a5 bg-white px-3 py-2 text-2"
                href={
                  preview === "member"
                    ? `/experiences/${experienceId}`
                    : `/experiences/${experienceId}?preview=member`
                }
              >
                {preview === "member" ? "Exit member preview" : "Preview as member"}
              </a>

              <Link
                className="rounded-md bg-gray-900 px-3 py-2 text-2 text-white"
                href={`/experiences/${experienceId}/admin`}
              >
                Admin panel
              </Link>
            </div>
          ) : null}
          <CheckoutButton experienceId={experienceId} />
          <Link href="https://docs.whop.com/apps" target="_blank">
            <Button variant="classic" size="3">
              Developer Docs
            </Button>
          </Link>
        </div>
      )}

      {/* Main content */}
      <div className="flex flex-col gap-4">
          {/* Step 1 */}
          {!hideInlineNicheSelector && (
            <section className="relative rounded-2xl border border-slate-200/60 bg-white/90 backdrop-blur-sm p-4 sm:p-6 premium-shadow overflow-hidden hover:ai-glow-subtle transition-all duration-300">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-50/30 via-transparent to-blue-50/30 pointer-events-none" />
              <div className="relative">
                <h2 className="text-lg sm:text-xl font-bold text-slate-900 mb-2">
                  Choose your focus
                </h2>
                <p className="text-sm text-slate-600 mb-4 leading-relaxed">
                  Pick the main area you&apos;re focused on right now. Later we&apos;ll
                  tailor drills and practice sessions around this choice.
                </p>

              <NicheSelector
                experienceId={experienceId}
                initialNiche={initialNiche}
                initialCustomNiche={initialCustomNiche}
                onNicheChange={(id, label, updatedCustomLabel) => {
                  setSelectedNiche(id);
                  setSelectedNicheLabel(label);
                  if ((id === "custom" || id === "CUSTOM") && updatedCustomLabel) {
                    setCustomNiche(updatedCustomLabel);
                    setSelectedNicheLabel(updatedCustomLabel || "Custom");
                  }
                }}
              />
              </div>
            </section>
          )}

          {/* Step 2 */}
          <section className="relative rounded-2xl border border-slate-200/60 bg-white/90 backdrop-blur-sm p-4 sm:p-6 premium-shadow overflow-hidden hover:ai-glow-subtle transition-all duration-300">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-50/30 via-transparent to-blue-50/30 pointer-events-none" />
            <div className="relative mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                  Start practicing
                </h2>
                <p className="mt-1 text-sm text-slate-600 leading-relaxed">
                  Tell the AI what you want to work on, and it will create
                  drills based on your focus.
                </p>
              </div>
              <ResetSessionModal 
                experienceId={experienceId}
                isUserMadeCustomNiche={
                  selectedNiche?.toLowerCase() === "custom" &&
                  typeof customNiche === "string" &&
                  customNiche.trim().length > 0
                }
              />
            </div>

            <PracticeArea
              nicheLabel={effectiveNicheLabel}
              nicheKey={selectedNiche}
              customNiche={customNiche}
              experienceId={experienceId}
            />
          </section>
      </div>
    </div>
  );
}



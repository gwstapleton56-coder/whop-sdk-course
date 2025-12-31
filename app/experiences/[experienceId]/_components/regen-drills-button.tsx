"use client";

import { useState } from "react";
import { Button } from "@whop/react/components";

type RegenDrillsButtonProps = {
  nicheKey: string | null;
  experienceId?: string;
  onDrillsRegenerated?: (drills: any[]) => void;
  onRegenerateStart?: () => void;
  onLimitReached?: () => void;
  isLimitReached?: boolean;
  practiceMode?: string | null;
};

export function RegenDrillsButton({ nicheKey, experienceId, onDrillsRegenerated, onRegenerateStart, onLimitReached, isLimitReached, practiceMode }: RegenDrillsButtonProps) {
  function getButtonText(): string {
    if (practiceMode === "D") {
      return "Continue with a harder scenario";
    }
    if (practiceMode === "C") {
      return "Continue with deeper coaching";
    }
    if (practiceMode === "B") {
      return "Continue with more practice questions";
    }
    if (practiceMode === "A") {
      return "Continue with another checklist";
    }
    return "Continue practicing";
  }
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function regen() {
    if (!nicheKey) {
      setErr("No active session");
      return;
    }

    // Gate if limit reached
    if (isLimitReached) {
      onLimitReached?.();
      return;
    }

    try {
      setErr(null);
      setLoading(true);
      onRegenerateStart?.(); // Call callback when regeneration starts

      const res = await fetch("/api/drills/regenerate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          nicheKey,
          experienceId, // Pass experienceId for creator niche context
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || `Failed (${res.status})`);
      }

      // Option A: update local state via callback
      if (onDrillsRegenerated && data?.session?.drills) {
        onDrillsRegenerated(data.session.drills);
      } else {
        // Option B: refresh to re-pull initial state from server
        window.location.reload();
      }
    } catch (e: any) {
      setErr(e?.message || "Failed to generate new drills");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Button variant="classic" size="3" onClick={regen} disabled={loading || !nicheKey}>
        {loading ? "Generating…" : getButtonText()}
      </Button>

      {err && (
        <div className="rounded-lg border border-red-a5 bg-red-a2 p-3 text-2 text-red-11">
          {err}
        </div>
      )}
    </div>
  );
}


"use client";

import { useState } from "react";
import { Button } from "@whop/react/components";
import type { Niche } from "@prisma/client";

const NICHE_LABELS: Record<string, string> = {
  TRADING: "Trading",
  SPORTS: "Sports Betting",
  SOCIAL_MEDIA: "Social Media & Clipping",
  RESELLING: "Reselling & Ecommerce",
  FITNESS: "Fitness",
  CUSTOM: "Custom",
};

type NicheContext = {
  niche: Niche;
  context: {
    id: string;
    label: string | null;
    context: string | null;
  } | null;
};

type AdminPanelProps = {
  experienceId: string;
  initialContexts: NicheContext[];
};

export function AdminPanel({ experienceId, initialContexts }: AdminPanelProps) {
  const [contexts, setContexts] = useState<Record<string, { label: string; context: string }>>(() => {
    const initial: Record<string, { label: string; context: string }> = {};
    initialContexts.forEach(({ niche, context }) => {
      initial[niche] = {
        label: context?.label ?? "",
        context: context?.context ?? "",
      };
    });
    return initial;
  });

  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [messages, setMessages] = useState<Record<string, string>>({});

  async function saveNiche(niche: Niche) {
    setSaving((prev) => ({ ...prev, [niche]: true }));
    setMessages((prev) => ({ ...prev, [niche]: "" }));

    try {
      const res = await fetch("/api/creator-niche", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          experienceId,
          niche,
          label: contexts[niche]?.label || null,
          context: contexts[niche]?.context || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Failed to save");
      }

      setMessages((prev) => ({ ...prev, [niche]: "✅ Saved" }));
      setTimeout(() => {
        setMessages((prev) => {
          const next = { ...prev };
          delete next[niche];
          return next;
        });
      }, 2000);
    } catch (err: any) {
      setMessages((prev) => ({ ...prev, [niche]: `❌ ${err.message}` }));
    } finally {
      setSaving((prev) => ({ ...prev, [niche]: false }));
    }
  }

  return (
    <div className="space-y-6">
      {initialContexts.map(({ niche }) => (
        <div key={niche} className="rounded-xl border border-gray-a5 bg-gray-a1 p-6">
          <h2 className="text-5 font-semibold mb-4">
            Niche: {NICHE_LABELS[niche] || niche}
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-3 font-semibold text-gray-11 mb-1">
                Label shown to users:
              </label>
              <input
                type="text"
                value={contexts[niche]?.label ?? ""}
                onChange={(e) => {
                  setContexts((prev) => ({
                    ...prev,
                    [niche]: { ...prev[niche], label: e.target.value },
                  }));
                }}
                placeholder={NICHE_LABELS[niche] || niche}
                className="w-full rounded-md border border-gray-a5 bg-gray-a1 px-3 py-2 text-3 text-gray-12 outline-none focus:border-blue-9"
              />
              <p className="mt-1 text-2 text-gray-9">
                This is what members see as the niche name (e.g., "Forex Scalping" instead of "Trading")
              </p>
            </div>

            <div>
              <label className="block text-3 font-semibold text-gray-11 mb-1">
                AI context (used for drills):
              </label>
              <textarea
                value={contexts[niche]?.context ?? ""}
                onChange={(e) => {
                  setContexts((prev) => ({
                    ...prev,
                    [niche]: { ...prev[niche], context: e.target.value },
                  }));
                }}
                placeholder="Focus on execution, risk management, discipline..."
                rows={4}
                className="w-full rounded-md border border-gray-a5 bg-gray-a1 px-3 py-2 text-3 text-gray-12 outline-none focus:border-blue-9 font-mono"
              />
              <p className="mt-1 text-2 text-gray-9">
                This context is injected into AI prompts when generating drills for this niche
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="classic"
                size="3"
                onClick={() => saveNiche(niche)}
                disabled={saving[niche]}
              >
                {saving[niche] ? "Saving..." : "Save"}
              </Button>
              {messages[niche] && (
                <span className="text-3 text-gray-11">{messages[niche]}</span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}


"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { PremiumButton } from "@/components/ui/PremiumButton";

type CustomNicheSetupProps = {
  onSave: (name: string) => Promise<void>;
};

export function CustomNicheSetup({ onSave }: CustomNicheSetupProps) {
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <Card className="p-6">
      <h2 className="text-xl font-semibold text-slate-900 mb-1">What niche are you practicing?</h2>
      <p className="text-sm text-slate-600 mb-4">
        Example: "Day trading", "Real estate wholesaling", "Nail tech clientele", "YouTube growth"
      </p>

      <input
        type="text"
        className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
        placeholder="Type your niche…"
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setError(null);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && value.trim() && !loading) {
            handleSave();
          }
        }}
        autoFocus
      />

      {error && (
        <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <PremiumButton
        onClick={handleSave}
        disabled={!value.trim() || loading}
        loading={loading}
        className="mt-4"
      >
        Continue
      </PremiumButton>
    </Card>
  );

  async function handleSave() {
    if (!value.trim() || loading) return;
    setLoading(true);
    setError(null);
    try {
      await onSave(value.trim());
    } catch (err: any) {
      setError(err?.message || "Failed to save custom niche. Please try again.");
    } finally {
      setLoading(false);
    }
  }
}


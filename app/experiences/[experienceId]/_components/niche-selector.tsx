// app/experiences/[experienceId]/_components/niche-selector.tsx
"use client";

import { Button } from "@whop/react/components";
import { useState, useEffect } from "react";

export function labelForNiche(id: string | null | undefined, presets: Array<{ key: string; label: string }> = []) {
  if (!id) return "None";
  if (id === "custom" || id === "CUSTOM") return "Custom";
  const preset = presets.find((p) => p.key === id);
  return preset?.label ?? id;
}

type Preset = {
  key: string;
  label: string;
  aiContext?: string | null;
  sortOrder?: number;
};

type Props = {
  experienceId: string;
  initialNiche: string | null;
  initialCustomNiche?: string;
  onNicheChange?: (nicheId: string, nicheLabel: string, customLabel?: string) => void;
};

export function NicheSelector({
  experienceId,
  initialNiche,
  initialCustomNiche = "",
  onNicheChange,
}: Props) {
  const [selected, setSelected] = useState<string | null>(initialNiche);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [customNiche, setCustomNiche] = useState(initialCustomNiche);
  const [presets, setPresets] = useState<Preset[]>([]);
  const [loadingPresets, setLoadingPresets] = useState(true);

  // Fetch presets on mount
  useEffect(() => {
    async function fetchPresets() {
      try {
        const res = await fetch(`/api/niches?experienceId=${encodeURIComponent(experienceId)}`);
        const data = await res.json();
        if (data.ok && Array.isArray(data.presets)) {
          setPresets(data.presets);
        }
      } catch (err) {
        console.error("Failed to fetch presets:", err);
      } finally {
        setLoadingPresets(false);
      }
    }
    fetchPresets();
  }, [experienceId]);

  // ✅ Build a clean list of niches:
  // - Never allow presets to include "custom" (because we always inject it ourselves)
  // - Deduplicate keys (case-insensitive)
  // - Always append exactly ONE custom option at the end
  const presetNichesClean = (presets ?? [])
    .filter((n) => n.key?.toLowerCase() !== "custom");

  const uniqueByKey = new Map<string, { key: string; label: string }>();
  for (const n of presetNichesClean) {
    const k = (n.key ?? "").toLowerCase().trim();
    if (!k) continue;
    if (!uniqueByKey.has(k)) uniqueByKey.set(k, { key: n.key, label: n.label });
  }

  const options = [
    ...Array.from(uniqueByKey.values()),
    { key: "custom", label: "Custom" },
  ];

  async function handleSelect(nicheId: string) {
    // Normalize to lowercase
    const normalizedId = nicheId.toLowerCase();
    
    if (normalizedId === "custom") {
      setSelected("custom");
      setError(null);
      return; // ✅ don't POST yet
    }

    try {
      setSaving(true);
      setMessage(null);
      setError(null);

      const body: any = { niche: normalizedId };
      if (normalizedId === "custom" && customNiche.trim()) {
        body.customNiche = customNiche.trim();
      }

      const res = await fetch("/api/niche", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || `Failed to save niche (${res.status})`);
      }      

      setSelected(normalizedId);
      if (onNicheChange) {
        // Find the label for this key
        const selectedPreset = options.find((o) => o.key.toLowerCase() === normalizedId);
        const label = selectedPreset?.label ?? normalizedId;
        onNicheChange(normalizedId, label, normalizedId === "custom" ? customNiche.trim() : undefined);
      }
      setMessage("Saved!");
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (loadingPresets) {
    return (
      <div className="space-y-3">
        <div className="text-2 text-gray-10">Loading niches...</div>
      </div>
    );
  }

	return (
		<div className="space-y-3">
			<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
				{options.map((niche) => {
					const isActive = selected?.toLowerCase() === niche.key.toLowerCase();
					return (
						<Button
							key={niche.key}
							type="button"
							size="3"
							variant={isActive ? "solid" : "soft"}
							className={`justify-start transition-all duration-200 ${
								isActive 
									? "ai-glow-subtle" 
									: ""
							}`}
							style={isActive ? {
								background: 'linear-gradient(135deg, rgb(139, 92, 246), rgb(59, 130, 246))',
								color: 'white',
								border: 'none',
								boxShadow: '0 0 0 1px rgba(139, 92, 246, 0.3), 0 4px 12px rgba(139, 92, 246, 0.25), 0 0 20px rgba(59, 130, 246, 0.15)'
							} : {
								background: 'rgba(255, 255, 255, 0.95)',
								border: '1.5px solid rgba(139, 92, 246, 0.3)',
								color: 'rgb(30, 41, 59)'
							}}
							onMouseEnter={(e) => {
								if (!isActive) {
									e.currentTarget.style.background = 'linear-gradient(135deg, rgba(139, 92, 246, 0.12), rgba(59, 130, 246, 0.12))';
									e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.5)';
									e.currentTarget.style.color = 'rgb(15, 23, 42)';
									e.currentTarget.style.boxShadow = '0 0 0 1px rgba(139, 92, 246, 0.3), 0 4px 12px rgba(139, 92, 246, 0.15)';
								}
							}}
							onMouseLeave={(e) => {
								if (!isActive) {
									e.currentTarget.style.background = 'rgba(255, 255, 255, 0.95)';
									e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.3)';
									e.currentTarget.style.color = 'rgb(30, 41, 59)';
									e.currentTarget.style.boxShadow = '';
								}
							}}
							disabled={saving}
							onClick={() => handleSelect(niche.key)}
						>
							<div className="flex flex-col items-start gap-0.5">
								<span className="font-medium">{niche.label}</span>
								<span className={`text-xs ${
									isActive ? "text-white/90" : "text-slate-600"
								}`}>
									{isActive ? "Selected" : "Click to select"}
								</span>
							</div>
						</Button>
					);
				})}
			</div>
      
      {(selected?.toLowerCase() === "custom" || selected === "CUSTOM") && (
  <div className="mt-3 space-y-2">
    <label className="text-3 text-gray-11">
      Describe your niche
      <input
        className="mt-1 w-full rounded-md border border-gray-a5 bg-gray-a1 px-3 py-2 text-3 text-gray-12 outline-none focus:border-blue-9"
        value={customNiche}
        onChange={(e) => setCustomNiche(e.target.value)}
        placeholder="Ex: Airbnb arbitrage, barbering, tattooing..."
      />
    </label>
    <p className="text-2 text-gray-9">
      The AI will use this description so drills match your exact niche.
    </p>
    <Button
      variant="classic"
      size="2"
      disabled={!customNiche.trim() || saving}
      onClick={async () => {
        try {
          setSaving(true);
          setError(null);

          const res = await fetch("/api/niche", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ niche: "custom", customNiche }),
          });

          if (!res.ok) {
            const data = await res.json().catch(() => null);
            throw new Error(data?.error || `Failed to save niche (${res.status})`);
          }

          // show saved feedback if you have it
          setSaved(true);
          setMessage("Saved!");
          setSelected("custom");
          if (onNicheChange) {
            onNicheChange("custom", customNiche.trim() || "Custom", customNiche.trim());
          }
        } catch (e: any) {
          setError(e?.message || "Something went wrong");
        } finally {
          setSaving(false);
        }
      }}
    >
      Save custom niche
    </Button>
  </div>
)}

			<div className="h-5 text-3 text-gray-10">
				{saving && "Saving..."}
				{!saving &&
					(selected
						? `Current focus: ${labelForNiche(selected, presets)}`
						: "No focus selected yet.")}
				{!saving && message && ` ${message}`}
				{!saving && error && <span className="text-red-9"> {error}</span>}
			</div>
		</div>
	);
}

"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/Card";

function prettyNicheLabel(n: string | null | undefined) {
  if (!n) return "—";
  if (n === "CUSTOM" || n.toLowerCase() === "custom") return "Custom";
  // Only format legacy enum-style keys (all caps with underscores)
  if (n === n.toUpperCase() && n.includes("_")) {
    return n
      .toLowerCase()
      .split("_")
      .map((w) => w[0]?.toUpperCase() + w.slice(1))
      .join(" ");
  }
  // Return label as-is (don't transform creator-provided labels)
  return n;
}

function getModeLabel(preference: string | null | undefined): string {
  switch (preference) {
    case "A":
      return "Checklist Builder";
    case "B":
      return "Practice Test";
    case "C":
      return "Coaching Q&A";
    case "D":
      return "Scenario Practice";
    default:
      return "Practice";
  }
}

function generateReinforcedPoints(objective: string | null | undefined, mode: string | null | undefined): string[] {
  // Generate 1-2 concrete points based on objective and mode
  const points: string[] = [];
  
  if (!objective) {
    return ["Building consistency through deliberate practice"];
  }

  const objLower = objective.toLowerCase();
  
  // Extract key concepts from objective
  if (objLower.includes("target") || objLower.includes("audience") || objLower.includes("segment")) {
    points.push("Prioritizing high-signal targeting over volume");
  }
  if (objLower.includes("message") || objLower.includes("copy") || objLower.includes("content")) {
    points.push("Structuring concise, outcome-focused messaging");
  }
  if (objLower.includes("decision") || objLower.includes("choice") || objLower.includes("select")) {
    points.push("Making decisions under real constraints");
  }
  if (objLower.includes("risk") || objLower.includes("manage") || objLower.includes("control")) {
    points.push("Managing risk while maintaining opportunity");
  }
  if (objLower.includes("qualify") || objLower.includes("lead") || objLower.includes("prospect")) {
    points.push("Identifying high-value opportunities efficiently");
  }
  if (objLower.includes("time") || objLower.includes("speed") || objLower.includes("fast")) {
    points.push("Optimizing for speed without sacrificing quality");
  }
  
  // Mode-specific additions
  if (mode === "D" && points.length < 2) {
    points.push("Applying strategy under realistic constraints");
  }
  if (mode === "C" && points.length < 2) {
    points.push("Refining reasoning through structured feedback");
  }
  
  // Default fallback
  if (points.length === 0) {
    points.push("Building consistency through deliberate practice");
  }
  
  return points.slice(0, 2); // Max 2 points
}

function generateNextTighten(objective: string | null | undefined, mode: string | null | undefined): string {
  if (!objective) {
    return "Applying the same logic under time pressure";
  }
  
  const objLower = objective.toLowerCase();
  
  // Generate next step based on what was practiced
  if (objLower.includes("target") || objLower.includes("audience")) {
    return "Scaling this approach across multiple channels";
  }
  if (objLower.includes("message") || objLower.includes("copy")) {
    return "Adapting messaging for different audience segments";
  }
  if (objLower.includes("decision") || objLower.includes("choice")) {
    return "Applying the same logic under time pressure";
  }
  if (objLower.includes("risk") || objLower.includes("manage")) {
    return "Balancing risk and opportunity with limited information";
  }
  if (objLower.includes("qualify") || objLower.includes("lead")) {
    return "Prioritizing leads when volume increases";
  }
  
  // Mode-specific suggestions
  if (mode === "D") {
    return "Handling more complex scenarios with multiple variables";
  }
  if (mode === "C") {
    return "Applying feedback patterns to new situations";
  }
  
  return "Applying the same logic under time pressure";
}

export function CompletionCard({ 
  summary, 
  progressCount: propProgressCount,
  experienceId,
  niche: nicheEnum,
  practiceMode,
  objective,
}: { 
  summary: any; 
  progressCount?: number;
  experienceId?: string;
  niche?: string;
  practiceMode?: string | null;
  objective?: string | null;
}) {
  const [creatorNicheLabel, setCreatorNicheLabel] = useState<string | null>(null);

  // Fetch creator niche label if available
  useEffect(() => {
    if (experienceId && nicheEnum && nicheEnum !== "CUSTOM") {
      fetch(`/api/creator-niche?experienceId=${encodeURIComponent(experienceId)}&niche=${encodeURIComponent(nicheEnum)}`)
        .then((res) => res.json())
        .then((data) => {
          if (data?.ok && data?.settings?.label) {
            setCreatorNicheLabel(data.settings.label);
          }
        })
        .catch((err) => {
          console.error("Failed to fetch creator niche label:", err);
        });
    }
  }, [experienceId, nicheEnum]);

  if (!summary) return null;

  // Prioritize propProgressCount (from state), then summary values
  const progressCount = propProgressCount !== undefined 
    ? propProgressCount 
    : (summary.setsCompleted ?? summary.total ?? 0);
  
  // Use nicheLabel directly - no transformation
  const nicheDisplay = summary.nicheLabel 
    ?? creatorNicheLabel 
    ?? (summary.primaryNiche === "CUSTOM" && summary.customNiche?.trim() ? summary.customNiche.trim() : null)
    ?? summary.nicheKey 
    ?? summary.primaryNiche 
    ?? "—";

  const mode = practiceMode || summary.practiceMode || summary.practice_preference;
  const sessionObjective = objective || summary.objective;
  const reinforcedPoints = generateReinforcedPoints(sessionObjective, mode);
  const nextTighten = generateNextTighten(sessionObjective, mode);
  
  return (
    <Card className="relative overflow-hidden border-blue-200/60 bg-gradient-to-br from-blue-50/30 to-white p-4 sm:p-6">
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50/20 via-transparent to-purple-50/20 pointer-events-none rounded-2xl" />
      <div className="relative">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
              <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="text-lg font-bold text-slate-900">Session complete</div>
          </div>
          {sessionObjective && (
            <div className="mt-2 text-sm text-slate-600 leading-relaxed">
              You practiced <span className="font-medium text-slate-700">{sessionObjective.toLowerCase()}</span>.
            </div>
          )}
        </div>

        {/* What you reinforced */}
        <div className="mb-5">
          <div className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-3">
            What you reinforced
          </div>
          <ul className="space-y-2">
            {reinforcedPoints.map((point, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm text-slate-700">
                <span className="text-purple-500 mt-1">•</span>
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* What to tighten next */}
        <div className="mb-5">
          <div className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2">
            What to tighten next
          </div>
          <div className="text-sm text-slate-700 leading-relaxed bg-slate-50/50 rounded-lg p-3 border border-slate-200/50">
            {nextTighten}
          </div>
        </div>

        {/* Session snapshot */}
        <div className="pt-4 border-t border-slate-200/60">
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-500">
            {mode && (
              <div className="flex items-center gap-1.5">
                <span className="font-semibold">Mode:</span> 
                <span className="text-slate-600">{getModeLabel(mode)}</span>
              </div>
            )}
            {nicheDisplay && (
              <div className="flex items-center gap-1.5">
                <span className="font-semibold">Focus:</span> 
                <span className="text-slate-600">{nicheDisplay}</span>
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <span className="font-semibold">Session:</span> 
              <span className="text-slate-600">#{progressCount}</span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

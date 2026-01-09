"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@whop/react/components";
import { RegenDrillsButton } from "./regen-drills-button";
import { ResetSessionModal } from "./reset-session-modal";
import { CompletionCard } from "./completion-card";
import { ProgressConfirmation } from "@/components/onboarding/ProgressConfirmation";
import { getRequiredFieldsForNiche, type RequiredField } from "@/lib/niche-requirements";
import { getEntitlements } from "@/lib/entitlements";
import { PRO_CHECKOUT_URL } from "@/lib/config";
import { getOnboardingState, setOnboardingState, completeOnboardingStep } from "@/lib/onboarding";

// Legacy drill type (for backward compat)
type Drill = {
  id: string;
  question: string;
  questionType: "open" | "multiple_choice";
  options?: string[];          // for MC
  correctOptionIndex?: number; // for MC
  correctAnswer: string;
  explanation: string;
};

// New drill plan types
type PracticeMode = "checklist" | "test" | "coaching" | "walkthrough";

type DrillItem =
  | {
      kind: "checklist";
      title: string;
      items: string[];
      checkpoints?: { prompt: string; expected?: string }[];
    }
  | {
      kind: "mcq";
      id: string;
      question: string;
      choices: { id: string; text: string }[];
      correctChoiceId: string;
      explanation: string;
      topic?: string;
      difficulty?: "easy" | "medium" | "hard";
    }
  | {
      kind: "coaching";
      id: string;
      prompt: string;
      rubric?: string[];
      feedbackStyle?: "supportive" | "direct" | "exam";
    }
  | {
      kind: "walkthrough";
      id: string;
      scenario: string;
      steps: { prompt: string; hint?: string }[];
      expectedOutcome: string;
    };

type DrillPlan = {
  mode: PracticeMode;
  targetCount: number;
  chunkSize: number;
  stopRule: "fixed" | "mastery_2_sets_80" | "user_stop" | "scenario_complete";
  rationale: string;
};

type DrillResponse = {
  drill_plan: DrillPlan;
  drills: DrillItem[];
  has_more: boolean;
  next_cursor: string | null;
};

// Checklist types
type ChecklistSetupDrillset = {
  kind: "checklist_setup";
  title: string;
  questions: { id: "goal" | "location" | "constraints" | "level"; label: string; placeholder: string }[];
};

type ChecklistBuilderDrillset = {
  kind: "checklist_builder";
  title: string;
  nicheDisplay: string;
  steps: { id: string; title: string; instruction: string; definitionOfDone: string; tip: string | null }[];
};

type AnyDrillset = ChecklistSetupDrillset | ChecklistBuilderDrillset | null;

type SessionState = {
  struggle: string;
  objective?: string | null;
  clarification?: {
    question: string;
    options: ClarificationOption[];
  } | null;
  practice_preference?: "A" | "B" | "C" | "D" | null;
  drills: Drill[] | null;
  currentIndex: number;
  userAnswers: Record<number, string>;
  selectedOptions: Record<number, number | null>;
  evaluations: Record<number, EvaluationState>;
  // New drill plan fields
  drill_plan?: DrillPlan;
  drill_items?: DrillItem[];
  has_more?: boolean;
  next_cursor?: string | null;
  // Drill set completion tracking
  drillSetsCompleted?: number;
  lastCompletedClientId?: string;
};

type PracticeAreaProps = {
  nicheLabel: string | null;
  nicheKey: string | null;
  customNiche?: string;
  experienceId?: string;
  onProgressUpdate?: (p: any) => void;
};

type ClarificationOption = { key: "A" | "B" | "C" | "D"; label: string };

type EvaluationState = {
  verdict: "strong" | "close" | "wrong";
  headline: string;
  coaching: string;
  improvedAnswer: string;
} | null;

// Session intelligence types
type SessionSignals = {
  incorrectByTopic: Record<string, number>;
  correctByTopic: Record<string, number>;
  attempts: number;
  correct: number;
  lastAnswerQuality: "rushed" | "close" | "solid" | "unknown";
  modeMismatch: boolean;
  repeatedMistakeTopic: string | null;
  recommendedMode: "checklist" | "test" | "coaching" | "walkthrough" | null;
  suggestionReason: string | null;
};

function defaultSignals(): SessionSignals {
  return {
    incorrectByTopic: {},
    correctByTopic: {},
    attempts: 0,
    correct: 0,
    lastAnswerQuality: "unknown",
    modeMismatch: false,
    repeatedMistakeTopic: null,
    recommendedMode: null,
    suggestionReason: null,
  };
}

function inferAnswerQuality(args: {
  wasCorrect: boolean;
  userText?: string | null;
}): SessionSignals["lastAnswerQuality"] {
  const textLen = (args.userText ?? "").trim().length;
  if (textLen > 0 && textLen < 10 && !args.wasCorrect) return "rushed";
  if (!args.wasCorrect) return "unknown";
  return "solid";
}

const makeEmptySession = (): SessionState => ({
  struggle: "",
  objective: null,
  clarification: null,
  practice_preference: null,
  drills: null,
  currentIndex: 0,
  userAnswers: {},
  selectedOptions: {},
  evaluations: {},
});

export function PracticeArea({
  nicheLabel,
  nicheKey: propNicheKey,
  customNiche = "",
  experienceId,
  onProgressUpdate,
}: PracticeAreaProps) {
  const [sessions, setSessions] = useState<Record<string, SessionState>>({});
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const answerRef = useRef<HTMLTextAreaElement | null>(null);
  const [loadingSession, setLoadingSession] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [hasExistingSession, setHasExistingSession] = useState(false);
  const drillsRef = useRef<HTMLDivElement | null>(null);
  const [phase, setPhase] = useState<"idle" | "clarify" | "drills">("idle");
  const [completionPosted, setCompletionPosted] = useState(false);
  const [completionSummary, setCompletionSummary] = useState<any>(null);
  const [progressCount, setProgressCount] = useState<number>(0);
  const [microMsg, setMicroMsg] = useState<string | null>(null);
  const [regenLoading, setRegenLoading] = useState(false);
  
  // Niche profile state (for smart context questions)
  const [requiredField, setRequiredField] = useState<RequiredField | null>(null);
  const [requiredAnswer, setRequiredAnswer] = useState("");
  const [nicheProfile, setNicheProfile] = useState<any>(null);
  const [pendingPref, setPendingPref] = useState<"A" | "B" | "C" | "D" | null>(null);

  // Session intelligence state
  const [sessionSignals, setSessionSignals] = useState<Record<string, SessionSignals>>({});

  // Checklist state
  const [checklistSetup, setChecklistSetup] = useState<Record<string, Record<string, string>>>({});
  const [checklistProgress, setChecklistProgress] = useState<Record<string, number>>({});
  const [checklistNotes, setChecklistNotes] = useState<Record<string, Record<string, string>>>({});
  const [currentDrillset, setCurrentDrillset] = useState<AnyDrillset>(null);

  // Pro status - SINGLE SOURCE OF TRUTH
  const [proStatus, setProStatus] = useState<{ isPro: boolean } | null>(null);
  const [showThankYou, setShowThankYou] = useState(false);

  // Track previous isPro value to detect transitions
  const prevIsProRef = useRef<boolean>(false);

  // Single source of truth: isPro derived from proStatus
  const isPro = proStatus?.isPro === true;
  const userPlan: "free" | "pro" = isPro ? "pro" : "free";
  const entitlements = getEntitlements(userPlan);

  const [upgradeContext, setUpgradeContext] = useState<null | {
    type: "mode" | "limit";
    blockedMode?: "scenario" | "coaching";
  }>(null);

  // Daily cap state
  const [dailyCap, setDailyCap] = useState<{
    capped: boolean;
    remaining: number;
    used: number;
    limit: number | null;
    plan: "free" | "pro";
  } | null>(null);
  const [showCapModal, setShowCapModal] = useState(false);

  // Refresh Pro status function
  const refreshProStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/pro/status", { cache: "no-store" });
      const data = await res.json();
      setProStatus((prev) => {
        const wasPro = prev?.isPro === true;

        // If user just became Pro, close any cap modal / upgrade context.
        // The separate isPro effect handles the thank-you popup once globally.
        if (data.isPro && !wasPro) {
          setShowCapModal(false);
          setUpgradeContext(null);
        }

        return data;
      });
    } catch {
      setProStatus({ isPro: false });
    }
  }, []);

  // Fetch Pro status on mount
  useEffect(() => {
    refreshProStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Show thank you modal only when user transitions from free -> Pro.
  // We persist a single flag in localStorage so it does NOT re-fire on niche/route changes.
  useEffect(() => {
    const wasPro = prevIsProRef.current;
    prevIsProRef.current = isPro;

    // Only react on transition false -> true
    if (!isPro || wasPro) return;

    const key = "pro_thanked_v2";
    let already = false;
    try {
      if (typeof window !== "undefined") {
        already = window.localStorage.getItem(key) === "1";
      }
    } catch {
      already = false;
    }
    if (already) return;

    setShowThankYou(true);
    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(key, "1");
      }
    } catch {
      // ignore storage errors
    }
  }, [isPro]);

  // Use provided nicheKey or derive it
  const nicheKey = propNicheKey || "GENERAL";

  // Helper function for micro messages
  function popMicroMsg(msg: string) {
    setMicroMsg(msg);
    window.setTimeout(() => setMicroMsg(null), 1400);
  }

  // Refresh daily usage cap from server
  async function refreshDailyCap() {
    try {
      const res = await fetch("/api/usage", { cache: "no-store" });
      const data = await res.json();
      setDailyCap(data);
      return data;
    } catch {
      return null;
    }
  }

  // Micro-dopamine affirmations (shown randomly on correct answers)
  const microAffirmations = [
    "Good instinct.",
    "That's a solid approach.",
    "You're building consistency here.",
    "Sharp thinking.",
    "Nice execution.",
  ];

  function maybeShowAffirmation() {
    // 40% chance to show an affirmation
    if (Math.random() < 0.4) {
      const msg = microAffirmations[Math.floor(Math.random() * microAffirmations.length)];
      popMicroMsg(msg);
    }
  }

  // Update session signals after each answer
  function updateSessionSignals(wasCorrect: boolean, userText: string | null) {
    const topic = (activeDrill as any)?.topic || (activeDrill as any)?.tags?.[0] || "general";
    const quality = inferAnswerQuality({ wasCorrect, userText });

    setSessionSignals((prev) => {
      const s = prev[nicheKey] ?? defaultSignals();

      const incorrectByTopic = { ...s.incorrectByTopic };
      const correctByTopic = { ...s.correctByTopic };

      if (wasCorrect) correctByTopic[topic] = (correctByTopic[topic] ?? 0) + 1;
      else incorrectByTopic[topic] = (incorrectByTopic[topic] ?? 0) + 1;

      const repeatedMistakeTopic =
        !wasCorrect && (incorrectByTopic[topic] ?? 0) >= 2 ? topic : s.repeatedMistakeTopic;

      const mode = sessions[nicheKey]?.practice_preference;
      const modeMismatch = mode === "B" && repeatedMistakeTopic === topic; // B = test mode

      let recommendedMode: SessionSignals["recommendedMode"] = null;
      let suggestionReason: string | null = null;

      if (modeMismatch) {
        recommendedMode = "walkthrough";
        suggestionReason = `You missed "${topic}" more than once — a quick walkthrough will make it click faster.`;
      } else if (quality === "rushed") {
        recommendedMode = "coaching";
        suggestionReason = "Your answers look rushed — coaching mode will slow it down and build the reasoning.";
      } else if (repeatedMistakeTopic) {
        recommendedMode = "coaching";
        suggestionReason = `Let's isolate "${repeatedMistakeTopic}" for 2–3 targeted prompts before continuing.`;
      }

      const next: SessionSignals = {
        ...s,
        incorrectByTopic,
        correctByTopic,
        attempts: s.attempts + 1,
        correct: s.correct + (wasCorrect ? 1 : 0),
        lastAnswerQuality: quality,
        repeatedMistakeTopic,
        modeMismatch,
        recommendedMode,
        suggestionReason,
      };

      return { ...prev, [nicheKey]: next };
    });
  }

  // === Niche Profile Helpers ===
  async function ensureNicheProfileReady(args: {
    nicheKey: string;
    nicheLabel: string;
    aiContext?: string | null;
    customNiche?: string | null;
  }): Promise<boolean> {
    const required = getRequiredFieldsForNiche(args);
    if (required.length === 0) return true;

    const qs = new URLSearchParams({
      nicheKey: args.nicheKey,
      customNiche: args.customNiche || "",
    });

    const res = await fetch(`/api/experiences/${experienceId}/niche-profile?${qs.toString()}`, {
      cache: "no-store",
    });

    const data = await res.json().catch(() => null);
    const profile = data?.profile ?? null;
    setNicheProfile(profile);

    for (const r of required) {
      const hasValue = profile?.[r.key];
      if (!hasValue) {
        setRequiredField(r);
        setRequiredAnswer("");
        return false;
      }
    }

    return true;
  }

  // Apply drill response (new or appended)
  function applyDrillResponse(nKey: string, resp: DrillResponse, append: boolean) {
    setSessions((prev) => {
      const current = prev[nKey] ?? makeEmptySession();
      const existingItems = current.drill_items ?? [];

      return {
        ...prev,
        [nKey]: {
          ...current,
          drill_plan: resp.drill_plan,
          drill_items: append ? [...existingItems, ...resp.drills] : resp.drills,
          has_more: resp.has_more,
          next_cursor: resp.next_cursor,
        },
      };
    });
  }

  // Generate more drills (continuation)
  async function generateMoreDrills() {
    const currentSession = sessions[nicheKey];
    if (!currentSession?.has_more) return;

    // Gate drill set regeneration for free users after 2 completions
    const completed = currentSession?.drillSetsCompleted ?? 0;
    if (userPlan === "free" && completed >= entitlements.maxDrillSetsPerDay) {
      setUpgradeContext({ type: "limit" });
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/generate-drills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          niche: nicheLabel ?? nicheKey,
          nicheKey,
          experienceId,
          customNiche: nicheKey === "custom" ? customNiche : "",
          struggle: currentSession.struggle,
          objective: currentSession.objective,
          practice_preference: currentSession.practice_preference,
          cursor: currentSession.next_cursor,
          existing_count: (currentSession.drill_items ?? currentSession.drills ?? []).length,
          session_signals: sessionSignals[nicheKey] ?? defaultSignals(),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        // Handle FREE_LIMIT from server
        if (data?.error === "FREE_LIMIT") {
          setUpgradeContext({ type: "limit" });
          return;
        }
        throw new Error(data?.message || data?.error || "Failed to generate more drills");
      }

      const data = await res.json();
      
      // Check if response has new drill_plan format
      if (data.drill_plan) {
        applyDrillResponse(nicheKey, data as DrillResponse, true);
      } else if (data.drills) {
        // Legacy format - append to existing drills
        setSessions((prev) => ({
          ...prev,
          [nicheKey]: {
            ...prev[nicheKey],
            drills: [...(prev[nicheKey]?.drills ?? []), ...data.drills],
          },
        }));
      }
    } catch (e: any) {
      setError(e?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function submitRequiredField(pendingPref: "A" | "B" | "C" | "D") {
    if (!requiredField) return;

    const patch: Record<string, string> = {};
    patch[requiredField.key] = requiredAnswer;

    const res = await fetch(`/api/experiences/${experienceId}/niche-profile`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nicheKey,
        customNiche: nicheKey === "custom" ? customNiche : "",
        patch,
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      let data: any = null;
      try { data = text ? JSON.parse(text) : null; } catch {}
      console.error("Failed to save niche profile field:", {
        status: res.status,
        statusText: res.statusText,
        text,
        data,
      });
      return;
    }

    const data = await res.json();
    setNicheProfile(data.profile);
    setRequiredField(null);
    setRequiredAnswer("");

    // Resume drill generation - get current session to ensure we have objective
    const currentSessionForResume = sessions[nicheKey];
    if (!currentSessionForResume?.objective) {
      setError("Missing objective. Please start a new session.");
      return;
    }
    await generateAdaptiveDrills(pendingPref, currentSessionForResume);
  }

  // Helper functions for formatting
  function shortObjective(objective?: string | null) {
    if (!objective) return "—";
    return objective.replace(/^today['']s focus:\s*/i, "").trim();
  }

  function prettyNicheLabel(n?: string | null, custom?: string | null) {
    if (!n) return "—";
    // If it's "CUSTOM" enum or "custom" key, use the custom niche description
    if (n === "CUSTOM" || n.toLowerCase() === "custom") {
      return (custom ?? "Custom").trim();
    }
    // Use the nicheLabel prop if available (creator-provided label)
    if (nicheLabel && nicheLabel !== "Custom") {
      return nicheLabel;
    }
    // Only format legacy enum-style keys (all caps with underscores like SOCIAL_MEDIA)
    if (n === n.toUpperCase() && n.includes("_")) {
      return n
        .toLowerCase()
        .split("_")
        .map((w) => w[0]?.toUpperCase() + w.slice(1))
        .join(" ");
    }
    // Return as-is (don't transform creator-provided labels)
    return n;
  }

  // Debug: log when progressCount or completionSummary changes (dev only)
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      console.log("🔄 progressCount state changed to:", progressCount);
    }
  }, [progressCount]);
  
  useEffect(() => {
    if (completionSummary && process.env.NODE_ENV !== "production") {
      console.log("🔄 completionSummary changed:", {
        setsCompleted: completionSummary.setsCompleted,
        total: completionSummary.total,
        primaryNiche: completionSummary.primaryNiche,
        customNiche: completionSummary.customNiche,
      });
    }
  }, [completionSummary]);

  // Derive the "active session" from the selected niche
  const session = sessions[nicheKey] ?? makeEmptySession();

  // Get current answer value for auto-resize effect
  const currentAnswer = session.userAnswers[session.currentIndex] || "";

  // Auto-resize textarea whenever answer changes (typing, AI fill, session restore, etc.)
  useEffect(() => {
    const el = answerRef.current;
    if (!el) return;

    el.style.height = "auto";

    const maxHeight = 320; // ~8-9 lines
    const newHeight = Math.min(el.scrollHeight, maxHeight);

    el.style.height = `${newHeight}px`;
    el.style.overflowY = el.scrollHeight > maxHeight ? "auto" : "hidden";
  }, [currentAnswer]);

  // Load session from DB when nicheKey changes
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoadingSession(true);
      try {
        const res = await fetch(
          `/api/session?nicheKey=${encodeURIComponent(nicheKey)}`,
        );
        const json = await res.json();

        if (cancelled) return;

        if (res.ok && json.data) {
          // json.data should be your saved session object
          const loadedSession: SessionState = {
            struggle: json.data.struggle ?? "",
            objective: json.data.objective ?? null,
            clarification: json.data.clarification ?? null,
            practice_preference: json.data.practice_preference ?? null,
            drills: json.data.drills ?? null, // ✅ Load drills back in
            currentIndex: json.data.currentIndex ?? 0,
            userAnswers: json.data.userAnswers ?? {},
            selectedOptions: json.data.selectedOptions ?? {},
            evaluations: json.data.evaluations ?? {},
          };
          
          // Load completion summary if available
          if ((json as any).lastCompletionSummary) {
            setCompletionSummary((json as any).lastCompletionSummary);
          }
          
          // Check if there's an existing session with drills
          setHasExistingSession(
            Array.isArray(loadedSession.drills) && loadedSession.drills.length > 0,
          );
          setLastSavedAt(json.updatedAt ?? null);
          
          // Set phase based on session state
          if (loadedSession.objective && !loadedSession.practice_preference) {
            setPhase("clarify");
          } else if (Array.isArray(loadedSession.drills) && loadedSession.drills.length > 0) {
            setPhase("drills");
          } else {
            setPhase("idle");
          }
          
          setSessions((prev) => ({
            ...prev,
            [nicheKey]: loadedSession,
          }));

          // Auto-scroll to drills if they exist
          if (loadedSession.drills && loadedSession.drills.length > 0) {
            setTimeout(() => {
              drillsRef.current?.scrollIntoView({ behavior: "smooth" });
            }, 150);
          }
        } else {
          // new niche session: reset clean
          setHasExistingSession(false);
          setLastSavedAt(null);
          setPhase("idle");
          setSessions((prev) => ({
            ...prev,
            [nicheKey]: makeEmptySession(),
          }));
        }
      } catch (err) {
        console.error("Failed to load session:", err);
        if (!cancelled) {
          setHasExistingSession(false);
          setLastSavedAt(null);
          setPhase("idle");
          setSessions((prev) => ({
            ...prev,
            [nicheKey]: makeEmptySession(),
          }));
        }
      } finally {
        if (!cancelled) {
          setLoadingSession(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [nicheKey]);

  // Save session (debounced) whenever it changes
  useEffect(() => {
    // don't save until nicheKey is valid (custom must have text)
    if (nicheKey.startsWith("CUSTOM:") && nicheKey === "CUSTOM:") return;

    const currentSession = sessions[nicheKey];
    if (!currentSession) return; // Don't save if session doesn't exist yet

    const t = setTimeout(async () => {
      // Get fresh session data at save time
      const sessionToSave = sessions[nicheKey];
      if (!sessionToSave) return;

      try {
        // Build session data payload
        const sessionData = {
          struggle: sessionToSave.struggle,
          objective: sessionToSave.objective,
          clarification: sessionToSave.clarification,
          practice_preference: sessionToSave.practice_preference,
          drills: sessionToSave.drills, // ✅ must be here
          currentIndex: sessionToSave.currentIndex,
          userAnswers: sessionToSave.userAnswers,
          selectedOptions: sessionToSave.selectedOptions,
          evaluations: sessionToSave.evaluations,
        };

        // Ensure drills are plain JSON (no Dates, Sets, Maps, functions, undefined)
        // Force it safe right before saving
        const safeSessionData = JSON.parse(JSON.stringify(sessionData));

        await fetch("/api/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nicheKey,
            data: safeSessionData,
          }),
        });
      } catch (err) {
        console.error("Failed to save session:", err);
      }
    }, 500); // debounce 0.5s

    return () => clearTimeout(t);
  }, [
    nicheKey,
    sessions, // Watch sessions - will re-run when any session changes
  ]);

  const activeDrill = session.drills ? session.drills[session.currentIndex] : null;

  // Helper to save session immediately (no debounce)
  async function saveSession(next: SessionState) {
    if (!nicheKey || nicheKey === "CUSTOM:") return;

    try {
      setSaveState("saving");

      // IMPORTANT: make drills JSON-safe
      const safe = {
        ...next,
        drills: JSON.parse(JSON.stringify(next.drills ?? null)),
      };

      const res = await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nicheKey, data: safe }),
      });

      if (!res.ok) {
        setSaveState("error");
        const msg = await res.text();
        console.error("SAVE SESSION FAILED:", res.status, msg);
        return;
      }

      const json = await res.json().catch(() => null);
      setLastSavedAt(json?.updatedAt ?? new Date().toISOString());
      setSaveState("saved");

      // fade back to idle after a sec
      setTimeout(() => setSaveState("idle"), 1200);
    } catch (err) {
      setSaveState("error");
      console.error("Failed to save session:", err);
    }
  }

  // === Start Session (Objective + MC) ===
  async function startSession() {
    if (!session.struggle.trim()) return;
    if (!nicheKey) return;

    // Gate daily session limit for free users
    // TODO: Replace with actual sessionsStartedToday from server
    const sessionsToday = progressCount > 0 ? 1 : 0; // Simplified: treat any progress as 1 session
    if (sessionsToday >= entitlements.dailySessions) {
      setUpgradeContext({ type: "limit" });
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/session-start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          niche: nicheLabel ?? nicheKey,
          struggle: session.struggle,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Failed to start session");
      }

      const data = await res.json();

      const newSession = {
        ...session,
        objective: data.objective,
        clarification: {
          question: data.clarificationQuestion,
          options: data.options,
        },
        practice_preference: null,
        drills: null,
        currentIndex: 0,
        userAnswers: {},
        selectedOptions: {},
        evaluations: {},
      };

      setSessions((prev) => ({
        ...prev,
        [nicheKey]: newSession,
      }));

      setPhase("clarify");

      // Save context immediately (struggle and objective)
      try {
        await saveSessionContext({
          struggle: session.struggle,
          objective: data.objective,
        });
      } catch (e: any) {
        console.error("Failed to save session context:", e);
        // Continue even if context save fails
      }

      // Save to session immediately
      await saveSession(newSession);
    } catch (e: any) {
      setError(e?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  // Save session context (struggle, objective, practice_preference)
  async function saveSessionContext(partial: {
    struggle?: string;
    objective?: string;
    practice_preference?: string;
  }) {
    if (!experienceId || !nicheKey) return;

    const res = await fetch("/api/session/context", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nicheKey,
        niche: nicheKey.startsWith("CUSTOM:") ? "CUSTOM" : nicheKey,
        customNiche: nicheKey.startsWith("CUSTOM:") ? nicheKey.replace("CUSTOM:", "") : null,
        struggle: partial.struggle ?? session.struggle,
        objective: partial.objective ?? session.objective,
        practice_preference: partial.practice_preference ?? session.practice_preference,
      }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      throw new Error(data?.error || `Failed to save session context (${res.status})`);
    }
  }

  // === Choose Preference (then generate drills) ===
  async function choosePreference(key: "A" | "B" | "C" | "D") {
    console.log("[DEBUG] choosePreference called with key:", key);
    setError(null);

    // Check daily cap first (skip for Pro users)
    if (!isPro) {
      const cap = dailyCap ?? (await refreshDailyCap());
      if (cap?.capped) {
        setShowCapModal(true);
        return;
      }
    }

    // Gate Scenario (D) and Coaching (C) for free users
    if (key === "D" && !entitlements.canUseScenario) {
      setUpgradeContext({ type: "mode", blockedMode: "scenario" });
      return;
    }
    if (key === "C" && !entitlements.canUseCoaching) {
      setUpgradeContext({ type: "mode", blockedMode: "coaching" });
      return;
    }

    const updatedSession = {
      ...session,
      practice_preference: key,
    };

    setSessions((prev) => ({
      ...prev,
      [nicheKey]: updatedSession,
    }));

    try {
      // Save context immediately (C-step #1)
      await saveSessionContext({ practice_preference: key });
      
      // Also save full session state
      await saveSession(updatedSession);
    } catch (e: any) {
      console.error("Failed to save session context:", e);
      setError(String(e));
      return;
    }

    // Check if niche profile is complete before generating drills
    const ready = await ensureNicheProfileReady({
      nicheKey,
      nicheLabel: nicheLabel ?? nicheKey,
      customNiche: nicheKey === "custom" ? customNiche : null,
    });

    if (!ready) {
      console.log("[DEBUG] Niche profile not ready, setting pending pref:", key);
      setPendingPref(key);
      return; // Wait for user to answer required field
    }

    // Verify we have an objective before generating drills
    if (!updatedSession.objective) {
      console.error("[DEBUG] No objective found in session, cannot generate drills");
      setError("Missing objective. Please start a new session.");
      return;
    }

    // Now generate drills based on selection - use updatedSession to ensure we have the latest data
    console.log("[DEBUG] Calling generateAdaptiveDrills with key:", key, "objective:", updatedSession.objective);
    await generateAdaptiveDrills(key, updatedSession);
  }

  // === Generate Adaptive Drills ===
  async function generateAdaptiveDrills(pref: "A" | "B" | "C" | "D", sessionOverride?: SessionState) {
    // Use provided session override or current session
    const currentSession = sessionOverride || session;
    
    if (!currentSession.objective) {
      console.error("[DEBUG] generateAdaptiveDrills: No objective found", { 
        hasOverride: !!sessionOverride, 
        objective: currentSession.objective,
        sessionObjective: session.objective 
      });
      setError("Missing objective. Please start a new session.");
      return;
    }

    console.log("[DEBUG] generateAdaptiveDrills starting", { 
      pref, 
      objective: currentSession.objective,
      struggle: currentSession.struggle 
    });

    setLoading(true);
    setError(null);

    try {
      // For checklist mode, include setup data
      const setupForThisNiche = pref === "A" ? checklistSetup[nicheKey] : undefined;

      console.log("[DEBUG] Sending generate-drills request", {
        niche: nicheLabel ?? nicheKey,
        nicheKey,
        experienceId,
        customNiche: nicheKey === "custom" ? customNiche : null,
        struggle: currentSession.struggle,
        objective: currentSession.objective,
        practice_preference: pref,
      });

      const res = await fetch("/api/generate-drills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          niche: nicheLabel ?? nicheKey,
          nicheKey, // Pass nicheKey so the route can save context
          experienceId, // Pass experienceId for creator niche context
          customNiche: nicheKey === "custom" ? customNiche : null,
          struggle: currentSession.struggle,
          objective: currentSession.objective,
          practice_preference: pref,
          session_signals: sessionSignals[nicheKey] ?? defaultSignals(),
          checklistSetup: setupForThisNiche,
        }),
      });

      console.log("[DEBUG] generate-drills response status:", res.status, res.ok);

      if (!res.ok) {
        let data: any = null;
        try {
          const text = await res.text();
          console.log("[DEBUG] Response text:", text);
          data = text ? JSON.parse(text) : null;
        } catch (parseErr) {
          console.error("[DEBUG] Failed to parse error response:", parseErr);
          data = null;
        }
        
        console.error("[DEBUG] generate-drills failed:", res.status, data);
        
        // Handle FREE_LIMIT from server (403 status)
        if (res.status === 403 && (data?.error === "FREE_LIMIT" || !data)) {
          console.log("[DEBUG] Free limit reached, showing upgrade context");
          setUpgradeContext({ type: "limit" });
          setLoading(false);
          return;
        }
        
        const errorMsg = data?.message || data?.error || `Failed to generate drills (${res.status})`;
        console.error("[DEBUG] Throwing error:", errorMsg);
        throw new Error(errorMsg);
      }

      const data = await res.json();
      console.log("[DEBUG] generate-drills response data:", { 
        hasDrillset: !!data.drillset,
        hasDrills: !!data.drills,
        drillsCount: data.drills?.length || 0 
      });

      // Handle checklist drillset response
      if (data.drillset) {
        console.log("[DEBUG] Setting checklist drillset");
        setCurrentDrillset(data.drillset);
        setPhase("drills");
        setHasExistingSession(true);
        
        // Save last practiced niche to localStorage
        try {
          const nicheName = nicheLabel || nicheKey || "Unknown";
          // Normalize the nicheKey to lowercase for consistency with URL routes
          // Ensure we're saving the slug (nicheKey), not the display label
          const normalizedKey = nicheKey?.toLowerCase().trim() || "";
          console.log("[RECENT] saving", { experienceId, slug: normalizedKey, label: nicheName });
          localStorage.setItem(
            "lastPracticedNiche",
            JSON.stringify({
              id: normalizedKey,
              name: nicheName,
              timestamp: Date.now(),
            })
          );
        } catch (e) {
          console.error("Failed to save last practiced niche to localStorage:", e);
        }
        return;
      }

      if (!data.drills || data.drills.length === 0) {
        console.error("[DEBUG] No drills in response:", data);
        throw new Error("No drills were generated. Try a clearer request.");
      }

      console.log("[DEBUG] Setting drills in session, count:", data.drills.length);
      const newSession = {
        ...currentSession,
        drills: data.drills,
        currentIndex: 0,
        userAnswers: {} as Record<number, string>,
        selectedOptions: {} as Record<number, number | null>,
        evaluations: {} as Record<number, EvaluationState>,
      };

      console.log("[DEBUG] Updating sessions state with new drills for nicheKey:", nicheKey);
      setSessions((prev) => {
        const updated = {
          ...prev,
          [nicheKey]: newSession,
        };
        console.log("[DEBUG] Sessions updated, new session has drills:", updated[nicheKey]?.drills?.length || 0);
        return updated;
      });

      setCurrentDrillset(null); // Clear any checklist drillset
      setHasExistingSession(true);
      console.log("[DEBUG] Setting phase to 'drills'");
      setPhase("drills");
      // Reset completion state for new drill set
      setCompletionPosted(false);
      setCompletionSummary(null);

      // Save drills immediately
      console.log("[DEBUG] Saving session with drills");
      try {
        await saveSession(newSession);
        console.log("[DEBUG] Session saved successfully");
      } catch (saveErr) {
        console.error("[DEBUG] Failed to save session:", saveErr);
        // Don't throw - drills are still in state even if save fails
      }

      // Save last practiced niche to localStorage when session completes
      try {
        const nicheName = nicheLabel || nicheKey || "Unknown";
        // Normalize the nicheKey to lowercase for consistency with URL routes
        // Ensure we're saving the slug (nicheKey), not the display label
        const normalizedKey = nicheKey?.toLowerCase().trim() || "";
        console.log("[RECENT] saving", { experienceId, slug: normalizedKey, label: nicheName });
        localStorage.setItem(
          "lastPracticedNiche",
          JSON.stringify({
            id: normalizedKey,
            name: nicheName,
            timestamp: Date.now(),
          })
        );
      } catch (e) {
        console.error("Failed to save last practiced niche to localStorage:", e);
      }
    } catch (e: any) {
      console.error("[DEBUG] generateAdaptiveDrills error:", e);
      console.error("[DEBUG] Error message:", e?.message);
      console.error("[DEBUG] Error stack:", e?.stack);
      setError(e?.message || "Something went wrong");
    } finally {
      setLoading(false);
      console.log("[DEBUG] generateAdaptiveDrills finished, loading set to false");
    }
  }

  // === Check scenario/open-ended with rubric ===
  async function checkOpenEnded(drill: any) {
    const currentAnswer = session.userAnswers[session.currentIndex] || "";
    if (!currentAnswer.trim()) return;

    setChecking(true);
    setError(null);

    try {
      const res = await fetch(`/api/experiences/${experienceId}/evaluate-open`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nicheKey,
          customNiche: nicheKey === "custom" ? customNiche : null,
          question: drill.question,
          prompt: drill.prompt,
          rubric: drill.evaluation?.rubric ?? [],
          greatAnswerExample: drill.evaluation?.greatAnswerExample ?? null,
          userAnswer: currentAnswer,
        }),
      });

      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || `evaluate-open failed (${res.status})`);
      }

      const data = await res.json();

      // Map API verdict to our internal format (API should return "strong" | "close" | "wrong")
      const apiVerdict = data.verdict || (data.score >= 70 ? "strong" : data.score >= 40 ? "close" : "wrong");
      const evaluation: EvaluationState = {
        verdict: apiVerdict === "strong" || apiVerdict === "correct" ? "strong" : apiVerdict === "close" || apiVerdict === "almost" ? "close" : "wrong",
        headline: data.verdict ? (data.verdict === "strong" ? "Nice work — you've got it." : data.verdict === "close" ? "You're on the right track" : "Let's refine this") : (data.score >= 70 ? "Nice work — you've got it." : data.score >= 40 ? "You're on the right track" : "Let's refine this"),
        coaching: data.feedback || "",
        improvedAnswer: data.improvedAnswer || "",
      };

      const updatedSession = {
        ...session,
        evaluations: { ...session.evaluations, [session.currentIndex]: evaluation },
      };
      setSessions((prev) => ({
        ...prev,
        [nicheKey]: updatedSession,
      }));

      // Update session signals (strong = correct, score >= 70)
      const wasCorrect = apiVerdict === "strong" || data.score >= 70;
      updateSessionSignals(wasCorrect, currentAnswer);

      // Show micro-affirmation on correct answers
      if (wasCorrect) maybeShowAffirmation();

      // Check if we just completed the last drill
      const isLastDrill = session.drills && session.currentIndex === session.drills.length - 1;
      if (isLastDrill) {
        await postCompletionOnce();
      }

      // Save after checking answer
      await saveSession(updatedSession);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Something went wrong while checking.");
    } finally {
      setChecking(false);
    }
  }

  // === Check answer (MC uses local check, open uses AI coach) ===
  async function checkAnswer() {
    if (!activeDrill) return;

    const currentAnswer = session.userAnswers[session.currentIndex] || "";
    const currentSelectedOption = session.selectedOptions[session.currentIndex] ?? null;

    // Check if this is an open-ended scenario drill
    const isOpenEnded =
      (activeDrill as any)?.evaluation?.type === "open" ||
      (activeDrill as any)?.kind === "scenario" ||
      (activeDrill as any)?.type === "open_ended";

    if (isOpenEnded) {
      await checkOpenEnded(activeDrill);
      return;
    }

    // MULTIPLE CHOICE
    if (
      activeDrill.questionType === "multiple_choice" &&
      activeDrill.options &&
      typeof activeDrill.correctOptionIndex === "number"
    ) {
      if (currentSelectedOption === null) return;

      const isCorrect = currentSelectedOption === activeDrill.correctOptionIndex;
      const correctText =
        activeDrill.options[activeDrill.correctOptionIndex] ?? "";

      const evaluation: EvaluationState = {
        verdict: isCorrect ? "strong" : "wrong",
        headline: isCorrect
          ? "Nice — you picked the best option! ✅"
          : "Let's refine this",
        coaching: activeDrill.explanation,
        improvedAnswer: isCorrect ? "" : (correctText || activeDrill.correctAnswer),
      };

      const updatedSession = {
        ...session,
        evaluations: { ...session.evaluations, [session.currentIndex]: evaluation },
      };
      setSessions((prev) => ({
        ...prev,
        [nicheKey]: updatedSession,
      }));

      // Update session signals
      updateSessionSignals(isCorrect, null);

      // Show micro-affirmation on correct answers
      if (isCorrect) maybeShowAffirmation();
      
      // Check if we just completed the last drill
      const isLastDrill = session.drills && session.currentIndex === session.drills.length - 1;
      if (isLastDrill) {
        await postCompletionOnce();
      }
      
      // Save after checking answer
      await saveSession(updatedSession);
      return;
    }

    // OPEN-ENDED (use AI evaluation) - fallback for drills without evaluation block
    if (!currentAnswer.trim()) return;

    setChecking(true);
    setError(null);

    try {
      const nicheLabelForEval = nicheLabel ?? nicheKey;
      const res = await fetch("/api/evaluate-answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          niche: nicheLabelForEval,
          question: activeDrill.question,
          correctAnswer: activeDrill.correctAnswer || "",
          explanation: activeDrill.explanation || "",
          userAnswer: currentAnswer,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Failed to evaluate answer");
      }

      const data = (await res.json()) as EvaluationState;

      const updatedSession = {
        ...session,
        evaluations: { ...session.evaluations, [session.currentIndex]: data },
      };
      setSessions((prev) => ({
        ...prev,
        [nicheKey]: updatedSession,
      }));

      // Update session signals (strong = correct)
      const wasCorrect = data?.verdict === "strong";
      updateSessionSignals(wasCorrect, currentAnswer);

      // Show micro-affirmation on correct answers
      if (wasCorrect) maybeShowAffirmation();

      // Check if we just completed the last drill
      const isLastDrill = session.drills && session.currentIndex === session.drills.length - 1;
      if (isLastDrill) {
        await postCompletionOnce();
      }

      // Save after checking answer
      await saveSession(updatedSession);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Something went wrong while checking.");
    } finally {
      setChecking(false);
    }
  }

  async function postCompletionOnce() {
    if (completionPosted) return;
    setCompletionPosted(true);

    // Save last practiced niche to localStorage when session completes
    try {
      const nicheName = nicheLabel || nicheKey || "Unknown";
      // Normalize the nicheKey to lowercase for consistency with URL routes
      // Ensure we're saving the slug (nicheKey), not the display label
      const normalizedKey = nicheKey?.toLowerCase().trim() || "";
      console.log("[RECENT] saving", { experienceId, slug: normalizedKey, label: nicheName });
      localStorage.setItem(
        "lastPracticedNiche",
        JSON.stringify({
          id: normalizedKey,
          name: nicheName,
          timestamp: Date.now(),
        })
      );
    } catch (e) {
      console.error("Failed to save last practiced niche to localStorage:", e);
    }

    // Get niche enum value and customNiche
    // nicheKey is the enum value (e.g., "CUSTOM", "TRADING", "FITNESS", etc.) - NOT the display label
    // For "GENERAL", we'll use the first available niche or handle it appropriately
    // customNiche prop contains the actual custom niche name when niche === "CUSTOM"
    let niche: "TRADING" | "SPORTS" | "SOCIAL_MEDIA" | "RESELLING" | "FITNESS" | "CUSTOM";
    if (nicheKey && ["TRADING", "SPORTS", "SOCIAL_MEDIA", "RESELLING", "FITNESS", "CUSTOM"].includes(nicheKey)) {
      niche = nicheKey as typeof niche;
    } else {
      // Default to TRADING if nicheKey is invalid or "GENERAL"
      niche = "TRADING";
      console.warn("⚠️ Invalid nicheKey, defaulting to TRADING:", nicheKey);
    }
    
    const customNicheValue = (niche === "CUSTOM" && customNiche) ? customNiche.trim() : null;
    
    // Generate idempotency key to prevent double-counting on retries
    const clientCompletionId = crypto.randomUUID();
    
    console.log("🔍 postCompletionOnce called:", { 
      nicheKey, 
      niche, // Niche enum value
      customNiche, 
      customNicheValue,
      clientCompletionId,
      experienceId
    });

    try {
      const res = await fetch("/api/progress/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          niche, // ✅ Send Niche enum value
          customNiche: customNicheValue, // ✅ Send customNiche (only when niche === CUSTOM)
          clientCompletionId, // ✅ Send idempotency key
        }),
      });

      // Read as text first to see raw response
      const text = await res.text();
      console.log("📥 progress/complete raw response:", { 
        status: res.status, 
        statusText: res.statusText,
        headers: Object.fromEntries(res.headers.entries()),
        text,
        textLength: text.length 
      });
      
      let data: any = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch (parseErr) {
        console.error("❌ Failed to parse response as JSON:", parseErr, "Raw text:", text);
        data = { error: "Failed to parse response", rawText: text };
      }

      console.log("📥 progress/complete parsed response:", data);

      if (!res.ok) {
        // Log detailed error information
        const errorInfo = {
          status: res.status,
          statusText: res.statusText,
          statusType: res.status >= 500 ? "SERVER_ERROR" : res.status >= 400 ? "CLIENT_ERROR" : "UNKNOWN",
          headers: Object.fromEntries(res.headers.entries()),
          data,
          hasError: !!data?.error,
          errorMessage: data?.error,
          errorDetails: data?.details,
          rawText: text,
          textLength: text?.length || 0,
        };
        console.error("❌ progress/complete failed - non-200 status:", errorInfo);
        
        // If we have an error message, show it
        const errorMsg = data?.error || data?.details || `Server returned ${res.status} ${res.statusText}`;
        console.error("❌ Error message:", errorMsg);
        
        // Show completion card even if sync fails
        const currentSession = sessions[nicheKey];
        const objective = currentSession?.objective || null;
        const fallbackCount = progressCount || 1;
        
        setCompletionSummary({
          title: "Focused Practice Complete",
          nicheKey: nicheKey,
          nicheLabel: nicheLabel ?? customNicheValue ?? nicheKey,
          objectiveLabel: shortObjective(objective),
          progressLine: `You've completed ${fallbackCount} drill${fallbackCount === 1 ? "" : "s"} in this niche.`,
          winLine: "✅ +1 drill logged",
          nextHint: `Saved locally. Sync error: ${errorMsg}`,
          // Keep these for backwards compatibility
          primaryNiche: niche,
          customNiche: customNicheValue,
          setsCompleted: fallbackCount,
          total: fallbackCount,
        });
        return null;
      }

      // Handle empty or invalid response
      if (!data || typeof data !== "object" || Object.keys(data).length === 0) {
        console.error("❌ progress/complete returned empty or invalid response:", data);
        const currentSession = sessions[nicheKey];
        const objective = currentSession?.objective || null;
        const fallbackCount = progressCount || 1;
        
        setCompletionSummary({
          title: "Focused Practice Complete",
          nicheKey: nicheKey,
          nicheLabel: nicheLabel ?? customNicheValue ?? nicheKey,
          objectiveLabel: shortObjective(objective),
          progressLine: `You've completed ${fallbackCount} drill${fallbackCount === 1 ? "" : "s"} in this niche.`,
          winLine: "✅ +1 drill logged",
          nextHint: "Progress sync encountered an issue. Your drill was saved locally.",
          // Keep these for backwards compatibility
          primaryNiche: niche,
          customNiche: customNicheValue,
          setsCompleted: fallbackCount,
          total: fallbackCount,
        });
        // Increment locally as fallback
        if (progressCount === 0) {
          setProgressCount(1);
        }
        return null;
      }

      // ✅ set per-niche progress count from DB
      // CRITICAL: Update progressCount state FIRST with the API response
      // API returns `totalCompletedInNiche` (single source of truth)
      const totalCompletedInNiche = data?.totalCompletedInNiche;
      const hasValidCount = res.ok && data?.ok && typeof totalCompletedInNiche === "number" && totalCompletedInNiche >= 0;
      
      console.log("🔢 Processing API response:", {
        resOk: res.ok,
        dataOk: data?.ok,
        totalCompletedInNiche,
        niche: data?.niche,
        hasValidCount,
        currentProgressCount: progressCount,
        fullData: data
      });
      
      if (hasValidCount) {
        if (process.env.NODE_ENV !== "production") {
          console.log("✅ API returned valid totalCompletedInNiche:", totalCompletedInNiche);
          console.log("🔄 Setting progressCount from", progressCount, "to", totalCompletedInNiche);
        }
        setProgressCount(totalCompletedInNiche);
        
        // Increment drillSetsCompleted (with deduplication)
        setSessions((prev) => {
          const s = prev[nicheKey];
          if (!s) return prev;
          // Prevent double-count using clientCompletionId
          if (s.lastCompletedClientId === clientCompletionId) return prev;
          return {
            ...prev,
            [nicheKey]: {
              ...s,
              drillSetsCompleted: (s.drillSetsCompleted ?? 0) + 1,
              lastCompletedClientId: clientCompletionId,
            },
          };
        });
        
        // Update completionSummary with server-confirmed count
        // Get objective from current session if available
        const currentSession = sessions[nicheKey];
        const objective = currentSession?.objective || null;
        
        setCompletionSummary({
          title: "Focused Practice Complete",
          nicheKey: nicheKey,
          nicheLabel: nicheLabel ?? customNicheValue ?? nicheKey,
          objectiveLabel: shortObjective(objective),
          progressLine: `You've completed ${totalCompletedInNiche} drill${totalCompletedInNiche === 1 ? "" : "s"} in this niche.`,
          winLine: "✅ +1 drill logged",
          nextHint: totalCompletedInNiche >= 3 ? "Next set will be more scenario-based." : "Next set will be slightly harder.",
          // Keep these for backwards compatibility
          primaryNiche: niche,
          customNiche: customNicheValue,
          setsCompleted: totalCompletedInNiche,
          total: totalCompletedInNiche,
        });
        
        // Track first session completion for onboarding
        const onboardingState = getOnboardingState();
        if (onboardingState.step === "first_session_started" && totalCompletedInNiche === 1) {
          completeOnboardingStep("first_session_started"); // Advances to "first_session_complete"
        }
        
        // Show micro message
        popMicroMsg("✅ +1 drill logged");
        console.log("📝 Set completionSummary with totalCompletedInNiche:", totalCompletedInNiche);
      } else {
        console.error("❌ API did not return valid totalCompletedInNiche:", { 
          resOk: res.ok, 
          dataOk: data?.ok,
          totalCompletedInNiche,
          hasValidCount,
          dataType: typeof totalCompletedInNiche,
          fullData: data 
        });
        // Fallback: increment locally
        const fallbackCount = progressCount > 0 ? progressCount + 1 : 1;
        console.warn("⚠️ Using fallback count:", fallbackCount);
        setProgressCount(fallbackCount);
        
        // Get objective from current session if available
        const currentSession = sessions[nicheKey];
        const objective = currentSession?.objective || null;
        
        setCompletionSummary({
          title: "Focused Practice Complete",
          nicheKey: nicheKey,
          nicheLabel: nicheLabel ?? customNicheValue ?? nicheKey,
          objectiveLabel: shortObjective(objective),
          progressLine: `You've completed ${fallbackCount} drill${fallbackCount === 1 ? "" : "s"} in this niche.`,
          winLine: "✅ +1 drill logged",
          nextHint: "Progress sync encountered an issue. Your drill was saved locally.",
          // Keep these for backwards compatibility
          primaryNiche: niche,
          customNiche: customNicheValue,
          setsCompleted: fallbackCount,
          total: fallbackCount,
        });
      }

      return data;
    } catch (e) {
      console.error("progress/complete exception:", e);
      // ✅ Still show the completion card so UX never breaks
      const currentSession = sessions[nicheKey];
      const objective = currentSession?.objective || null;
      const fallbackCount = progressCount > 0 ? progressCount : 1;
      
      setCompletionSummary({
        title: "Focused Practice Complete",
        nicheKey: nicheKey,
        nicheLabel: nicheLabel ?? customNicheValue ?? nicheKey,
        objectiveLabel: shortObjective(objective),
        progressLine: `You've completed ${fallbackCount} drill${fallbackCount === 1 ? "" : "s"} in this niche.`,
        winLine: "✅ +1 drill logged",
        nextHint: "Saved your drill result locally. Progress sync will retry automatically.",
        // Keep these for backwards compatibility
        primaryNiche: niche,
        customNiche: customNicheValue,
        setsCompleted: fallbackCount,
        total: fallbackCount,
      });
      return null;
    }
  }

  async function nextDrill() {
    if (!session.drills) return;
    
    const nextIndex = (session.currentIndex + 1) % session.drills.length;
    const updatedSession = {
      ...session,
      currentIndex: nextIndex,
    };
    setSessions((prev) => ({
      ...prev,
      [nicheKey]: updatedSession,
    }));

    // Save after moving to next drill
    await saveSession(updatedSession);
  }

  const isMC =
    activeDrill?.questionType === "multiple_choice" &&
    activeDrill.options &&
    typeof activeDrill.correctOptionIndex === "number";

  return (
    <div className="space-y-4">
      {/* Micro message toast */}
      {microMsg && (
        <div className="rounded-lg border border-gray-a5 bg-gray-a1 px-3 py-2 text-2 text-gray-11">
          {microMsg}
        </div>
      )}

      {/* Session Header Context */}
      {phase === "drills" && session.objective && (
        <div className="rounded-lg border border-gray-a5 bg-gray-a2 p-3 sm:p-4 text-2">
          <div className="grid gap-1">
            <div><span className="text-gray-10">Focus:</span> <span className="font-medium">{nicheLabel || nicheKey}</span></div>
            <div><span className="text-gray-10">Training Mode:</span> <span className="font-medium">
              {session.practice_preference === "A" ? "Checklist Builder" : 
               session.practice_preference === "B" ? "Practice Test" : 
               session.practice_preference === "C" ? "Coaching" : 
               session.practice_preference === "D" ? "Scenario Practice" : "Practice"}
            </span></div>
            <div><span className="text-gray-10">Today's Focus:</span> <span className="font-medium">{shortObjective(session.objective)}</span></div>
          </div>
        </div>
      )}

      {/* Config / prompt area */}
      <div className="space-y-2">
        <p className="text-3 text-gray-11">
          What do you want to practice or what are you struggling with?
        </p>
        <textarea
          className="mt-1 w-full rounded-md border border-gray-a5 bg-gray-a1 px-3 py-2 text-3 text-gray-12 outline-none focus:border-blue-9"
          rows={3}
          value={session.struggle}
          onChange={(e) => {
            const struggle = e.target.value;
            setSessions((prev) => ({
              ...prev,
              [nicheKey]: { ...session, struggle },
            }));
          }}
          placeholder={
            nicheLabel
              ? customNiche && (nicheKey?.toLowerCase() === "custom")
                ? `Ex: In ${customNiche} I struggle with...`
                : `Ex: In the ${nicheLabel.toLowerCase()} niche I struggle with...`
              : "Ex: I'm struggling with managing risk in my trades..."
          }
        />
        {hasExistingSession && phase === "idle" && (
          <div className="rounded-lg border border-gray-a5 bg-gray-a1 p-3 sm:p-4 text-2 text-gray-11">
            <div className="font-semibold">Resume session</div>
            <div className="text-gray-10">
              You have an active session saved for this niche. You can continue, or start over.
            </div>
          </div>
        )}
        {phase === "idle" && (
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={startSession}
              disabled={loading || !session.struggle.trim()}
              className="
                glow-blue
                inline-flex items-center justify-center
                rounded-xl px-6 py-3
                text-sm font-semibold text-white
                bg-gradient-to-r from-blue-600 to-blue-600
                hover:from-blue-700 hover:to-blue-700
                shadow-lg
                border border-blue-400/30
                focus:outline-none
                transition-all duration-200
                cursor-pointer
                disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:from-blue-600 disabled:hover:to-blue-600
                hover:scale-105 active:scale-100
              "
            >
              {loading ? "Starting..." : "Start Session"}
            </button>
            {hasExistingSession && (
              <Button
                size="3"
                variant="soft"
                className="glow-blue !bg-white !border-blue-300/40 !text-slate-700 hover:!bg-gradient-to-r hover:!from-blue-50 hover:!to-blue-50"
                style={{
                  background: 'rgba(255, 255, 255, 0.95)',
                  border: '1.5px solid rgba(139, 92, 246, 0.3)',
                  color: 'rgb(30, 41, 59)',
                  fontWeight: '500'
                }}
                onClick={async () => {
                  // wipe local UI
                  const emptySession = makeEmptySession();
                  setSessions((prev) => ({
                    ...prev,
                    [nicheKey]: emptySession,
                  }));

                  // wipe DB session too
                  await saveSession(emptySession);

                  setHasExistingSession(false);
                  setPhase("idle");
                }}
              >
                Start over
              </Button>
            )}
          </div>
        )}
        {error && (
          <p className="text-2 text-red-11">
            {error}
          </p>
        )}
      </div>

      {/* Clarify phase: Show objective + MC question */}
      {phase === "clarify" && session.objective && session.clarification && (
        <div className="space-y-4" style={{ position: "relative", zIndex: 1 }}>
          <div className="rounded-lg border border-blue-a5 bg-blue-a1 p-3 sm:p-4">
            <p className="text-4 font-semibold text-blue-11">
              {session.objective}
            </p>
          </div>
          <div className="space-y-3">
            <p className="text-3 text-gray-11">
              {session.clarification.question}
            </p>
            <div className="space-y-2">
              {session.clarification.options && session.clarification.options.length > 0 ? (
                session.clarification.options.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log("[DEBUG] Button clicked for option:", option.key);
                    choosePreference(option.key);
                  }}
                  disabled={loading || dailyCap?.capped === true}
                  className={`
                    w-full rounded-xl border-2 px-4 py-3 text-left text-sm sm:text-base transition-all duration-200
                    ${session.practice_preference === option.key
                      ? "glow-blue border-blue-500 bg-gradient-to-r from-blue-50 to-blue-50 text-blue-900 font-semibold shadow-md"
                      : "border-slate-200 bg-white text-slate-700 active:scale-[0.98]"
                    }
                    ${loading || dailyCap?.capped === true
                      ? "opacity-50 cursor-not-allowed"
                      : "glow-blue cursor-pointer hover:border-blue-300 hover:bg-gradient-to-r hover:from-blue-50/60 hover:to-blue-50/60 hover:text-blue-800"
                    }
                    justify-start
                  `}
                  style={{ pointerEvents: loading || dailyCap?.capped === true ? "none" : "auto" }}
                >
                  <span className="font-semibold mr-2">{option.key}.</span>
                  {option.label}
                </button>
                ))
              ) : (
                <p className="text-2 text-gray-10">Loading practice mode options...</p>
              )}
            </div>

            {/* Inline Pro upgrade card (mode gate) */}
            {upgradeContext?.type === "mode" && (
              <div className="rounded-lg border border-gray-a5 bg-gray-a1 p-3 sm:p-4 text-3 mt-3">
                <div className="font-semibold mb-1">Pro feature</div>
                <div className="text-gray-10 mb-3">
                  {upgradeContext.blockedMode === "scenario"
                    ? "Scenario practice unlocks real-world situations and deeper feedback."
                    : "Coaching mode helps you fix your reasoning step-by-step."}
                </div>
                <div className="flex gap-2">
                  <a
                    href={PRO_CHECKOUT_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button variant="classic" size="2">
                      Unlock Pro — $9/month
                    </Button>
                  </a>
                  <Button
                    variant="soft"
                    size="2"
                    onClick={() => setUpgradeContext(null)}
                  >
                    Choose another mode
                  </Button>
                </div>
              </div>
            )}

            {loading && (
              <p className="text-2 text-gray-10">Generating drills...</p>
            )}
          </div>
        </div>
      )}

      {/* Required niche profile field (smart context question) */}
      {requiredField && pendingPref && (
        <div className="rounded-lg border border-gray-a5 bg-gray-a1 p-4">
          <div className="text-4 font-semibold mb-2">{requiredField.question}</div>

          <input
            className="w-full rounded-md border border-gray-a5 bg-white p-3 text-3"
            value={requiredAnswer}
            onChange={(e) => setRequiredAnswer(e.target.value)}
            placeholder={requiredField.placeholder || ""}
          />

          <div className="mt-3 flex gap-2">
            <button
              className="rounded-md border px-4 py-2 text-3"
              onClick={() => submitRequiredField(pendingPref)}
              disabled={!requiredAnswer.trim()}
            >
              Continue
            </button>

            <button
              className="rounded-md border px-4 py-2 text-3"
              onClick={() => {
                setRequiredField(null);
                setPendingPref(null);
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Checklist Setup UI */}
      {currentDrillset?.kind === "checklist_setup" && (
        <div className="rounded-xl border border-gray-a5 bg-gray-a1 p-4">
          <div className="text-lg font-semibold">{currentDrillset.title}</div>
          <div className="mt-3 grid gap-3">
            {currentDrillset.questions.map((q) => (
              <div key={q.id} className="grid gap-1">
                <div className="text-sm font-medium">{q.label}</div>
                <input
                  className="w-full rounded-md border border-gray-a5 bg-white px-3 py-2"
                  placeholder={q.placeholder}
                  value={(checklistSetup[nicheKey] || {})[q.id] || ""}
                  onChange={(e) =>
                    setChecklistSetup((prev) => ({
                      ...prev,
                      [nicheKey]: { ...(prev[nicheKey] || {}), [q.id]: e.target.value },
                    }))
                  }
                />
              </div>
            ))}

            <Button
              size="3"
              variant="classic"
              className="mt-2"
              disabled={loading}
              onClick={() => {
                const currentSessionForChecklist = sessions[nicheKey];
                if (currentSessionForChecklist?.objective) {
                  generateAdaptiveDrills("A", currentSessionForChecklist);
                } else {
                  setError("Missing objective. Please start a new session.");
                }
              }}
            >
              {loading ? "Generating..." : "Generate my checklist"}
            </Button>
          </div>
        </div>
      )}

      {/* Checklist Builder UI */}
      {currentDrillset?.kind === "checklist_builder" && (
        <div className="grid gap-4 rounded-xl border border-gray-a5 bg-gray-a1 p-4">
          <div>
            <div className="text-lg font-semibold">{currentDrillset.title}</div>
            <div className="text-sm text-gray-10">
              Step {Math.min((checklistProgress[nicheKey] ?? 0) + 1, currentDrillset.steps.length)} of {currentDrillset.steps.length}
            </div>
            <div className="text-sm text-gray-10 mt-1">
              Checklist Progress: {checklistProgress[nicheKey] ?? 0} / {currentDrillset.steps.length} steps completed
            </div>
          </div>

          {/* Current step */}
          {currentDrillset.steps[checklistProgress[nicheKey] ?? 0] ? (
            <div className="rounded-lg border border-gray-a5 bg-white p-4">
              <div className="text-base font-semibold">
                {currentDrillset.steps[checklistProgress[nicheKey] ?? 0].title}
              </div>
              <div className="mt-2 text-sm">
                {currentDrillset.steps[checklistProgress[nicheKey] ?? 0].instruction}
              </div>

              <div className="mt-3 rounded-md bg-gray-a2 p-3 text-sm">
                <div className="font-medium">Done looks like:</div>
                <div>{currentDrillset.steps[checklistProgress[nicheKey] ?? 0].definitionOfDone}</div>
                {currentDrillset.steps[checklistProgress[nicheKey] ?? 0].tip && (
                  <div className="mt-2 text-gray-10">
                    <span className="font-medium">Tip:</span> {currentDrillset.steps[checklistProgress[nicheKey] ?? 0].tip}
                  </div>
                )}
              </div>

              <div className="mt-3 grid gap-2">
                <div className="text-sm font-medium">Notes (optional)</div>
                <textarea
                  className="min-h-[80px] w-full rounded-md border border-gray-a5 p-2"
                  value={(checklistNotes[nicheKey] || {})[currentDrillset.steps[checklistProgress[nicheKey] ?? 0].id] || ""}
                  onChange={(e) =>
                    setChecklistNotes((prev) => ({
                      ...prev,
                      [nicheKey]: {
                        ...(prev[nicheKey] || {}),
                        [currentDrillset.steps[checklistProgress[nicheKey] ?? 0].id]: e.target.value,
                      },
                    }))
                  }
                />
              </div>

              <div className="mt-3 flex gap-2">
                <Button
                  size="2"
                  variant="soft"
                  disabled={(checklistProgress[nicheKey] ?? 0) === 0}
                  onClick={() =>
                    setChecklistProgress((prev) => ({
                      ...prev,
                      [nicheKey]: Math.max(0, (prev[nicheKey] ?? 0) - 1),
                    }))
                  }
                >
                  Back
                </Button>

                <Button
                  size="2"
                  variant="classic"
                  onClick={() => {
                    setChecklistProgress((prev) => ({
                      ...prev,
                      [nicheKey]: Math.min(currentDrillset.steps.length, (prev[nicheKey] ?? 0) + 1),
                    }));
                  }}
                >
                  Mark done & next
                </Button>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-green-a5 bg-green-a1 p-4">
              <div className="text-base font-semibold">Checklist complete ✅</div>
              <div className="mt-2 text-sm text-gray-10">
                You finished {currentDrillset.steps.length} steps.
              </div>
            </div>
          )}

          {/* Checklist so far */}
          <div className="rounded-lg border border-gray-a5 bg-white p-4">
            <div className="text-sm font-semibold">Your checklist</div>
            <div className="mt-2 grid gap-2 text-sm">
              {currentDrillset.steps.slice(0, Math.max(1, checklistProgress[nicheKey] ?? 0)).map((s) => (
                <div key={s.id} className="flex gap-2">
                  <div>☑</div>
                  <div>
                    <div className="font-medium">{s.title}</div>
                    <div className="text-gray-10">{s.instruction}</div>
                  </div>
                </div>
              ))}
            </div>

            <Button
              size="2"
              variant="soft"
              className="mt-3"
              onClick={() => {
                const text = currentDrillset.steps
                  .map((s, i) => `☐ ${i + 1}. ${s.title}\n- ${s.instruction}\n- Done: ${s.definitionOfDone}`)
                  .join("\n\n");
                navigator.clipboard.writeText(text);
                popMicroMsg("Checklist copied!");
              }}
            >
              Copy checklist
            </Button>
          </div>
        </div>
      )}

      {/* Drills display area */}
      {session.drills && activeDrill && !currentDrillset && (
        <div ref={drillsRef} className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-2 text-gray-10">
              {lastSavedAt
                ? `Last saved: ${new Date(lastSavedAt).toLocaleString()}`
                : "Not saved yet"}
            </div>

            <div className="text-2">
              {saveState === "saving" && (
                <span className="text-gray-10">Saving…</span>
              )}
              {saveState === "saved" && (
                <span className="text-green-11">Saved ✓</span>
              )}
              {saveState === "error" && (
                <span className="text-red-11">Save failed</span>
              )}
            </div>
          </div>
          <div className="rounded-lg border border-gray-a5 bg-gray-a1 p-3 sm:p-4 text-2 text-gray-11">
            <p>
              Niche: <strong>{nicheLabel ?? nicheKey ?? "GENERAL"}</strong>
            </p>
            <p className="mt-1">
              {session.drill_plan?.mode === "test" ? (
                <>Questions completed: {session.currentIndex}</>
              ) : (
                <>Drill {session.currentIndex + 1} of {session.drills.length}</>
              )}
              {" · "}
              {isMC ? "Multiple choice" : "Open-ended"}
            </p>
          </div>

          <div className="rounded-lg border border-gray-a5 bg-gray-a1 p-3 sm:p-4">
            {/* Scenario mode intro and scenario text */}
            {(session.practice_preference === "D" || (activeDrill as any)?.kind === "scenario") && (
              <>
                <div className="mb-3 rounded-md bg-blue-a1 border border-blue-a5 px-3 py-2 text-2 text-blue-11">
                  <span className="font-medium">Scenario Exercise</span> · Respond as if this were real life. Explain your reasoning.
                </div>
                {(activeDrill as any)?.scenario && (
                  <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <p className="text-sm font-semibold text-slate-900 mb-2">Scenario</p>
                    <p className="text-sm text-slate-700 whitespace-pre-line">{(activeDrill as any).scenario}</p>
                    {((activeDrill as any)?.contextBullets?.length > 0 || (activeDrill as any)?.constraints?.length > 0) && (
                      <div className="mt-3 space-y-2">
                        {(activeDrill as any)?.contextBullets?.length > 0 && (
                          <div>
                            <p className="text-xs font-medium text-slate-600 mb-1">What you know:</p>
                            <ul className="text-xs text-slate-600 list-disc list-inside space-y-0.5">
                              {(activeDrill as any).contextBullets.map((b: string, i: number) => (
                                <li key={i}>{b}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {(activeDrill as any)?.constraints?.length > 0 && (
                          <div>
                            <p className="text-xs font-medium text-slate-600 mb-1">Constraints:</p>
                            <ul className="text-xs text-slate-600 list-disc list-inside space-y-0.5">
                              {(activeDrill as any).constraints.map((c: string, i: number) => (
                                <li key={i}>{c}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
            <p className="mb-2 text-3 text-gray-11">Question</p>
            <p className="text-3 text-gray-12">{activeDrill.question}</p>
          </div>

          {/* Multiple choice options */}
          {isMC && activeDrill.options && (
            <div className="space-y-2">
              <p className="text-3 text-gray-11">Choose the best answer:</p>
              <div className="flex flex-col gap-2">
                {activeDrill.options.map((opt, idx) => {
                  const currentSelected = session.selectedOptions[session.currentIndex] ?? null;
                  const isSelected = currentSelected === idx;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setSessions((prev) => ({
                          ...prev,
                          [nicheKey]: {
                            ...session,
                            selectedOptions: { ...session.selectedOptions, [session.currentIndex]: idx },
                          },
                        }));
                      }}
                      className={`glow-blue w-full rounded-xl border-2 px-4 py-3 text-left text-sm transition-all duration-200 ${
                        isSelected
                          ? "border-blue-500 bg-gradient-to-r from-blue-50 to-blue-50 text-blue-900 font-semibold shadow-md ring-2 ring-blue-200"
                          : "border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-gradient-to-r hover:from-blue-50/60 hover:to-blue-50/60"
                      }`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Open-ended answer input */}
          {!isMC && (
            <div className="space-y-2">
              <label className="text-3 text-gray-11">
                Your answer
                <textarea
                  ref={answerRef}
                  className="mt-1 w-full resize-none overflow-hidden rounded-md border border-gray-a5 bg-gray-a1 px-3 py-2 text-3 text-gray-12 outline-none focus:border-blue-9"
                  value={session.userAnswers[session.currentIndex] || ""}
                  onChange={(e) => {
                    const answer = e.target.value;
                    setSessions((prev) => ({
                      ...prev,
                      [nicheKey]: {
                        ...session,
                        userAnswers: { ...session.userAnswers, [session.currentIndex]: answer },
                      },
                    }));
                  }}
                  rows={1}
                  placeholder="Type your answer here..."
                />
              </label>
            </div>
          )}

          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
            <Button
              size="3"
              onClick={checkAnswer}
              disabled={
                checking ||
                (!isMC && !(session.userAnswers[session.currentIndex] || "").trim()) ||
                (isMC && (session.selectedOptions[session.currentIndex] ?? null) === null)
              }
              className={`w-full sm:w-auto transition-all ${
                checking ||
                (!isMC && !(session.userAnswers[session.currentIndex] || "").trim()) ||
                (isMC && (session.selectedOptions[session.currentIndex] ?? null) === null)
                  ? "opacity-50 cursor-not-allowed"
                  : ""
              }`}
            >
              {checking ? "Reviewing..." : "Review my reasoning"}
            </Button>
            <Button size="3" variant="soft" onClick={nextDrill} className="w-full sm:w-auto">
              Continue training
            </Button>
          </div>

          {session.evaluations[session.currentIndex] && (
            <div
              className={`rounded-lg border p-3 text-3 ${
                session.evaluations[session.currentIndex]?.verdict === "strong"
                  ? "border-green-6 bg-green-2 text-green-11"
                  : session.evaluations[session.currentIndex]?.verdict === "close"
                  ? "border-amber-6 bg-amber-2 text-amber-11"
                  : "border-red-6 bg-red-2 text-red-11"
              }`}
            >
              <p className="font-semibold">{session.evaluations[session.currentIndex]?.headline}</p>
              <p className="mt-1">{session.evaluations[session.currentIndex]?.coaching}</p>
              {/* Only show example answer for "wrong" verdicts */}
              {session.evaluations[session.currentIndex]?.verdict === "wrong" && 
               session.evaluations[session.currentIndex]?.improvedAnswer && (
                <>
                  <p className="mt-2 text-2 opacity-80">
                    Example of a strong answer:
                  </p>
                  <p className="mt-1">{session.evaluations[session.currentIndex]?.improvedAnswer}</p>
                </>
              )}
            </div>
          )}

          {/* Show completion card and "Next actions" when on last drill */}
          {session.drills &&
            session.currentIndex === session.drills.length - 1 &&
            session.evaluations[session.currentIndex] && (
              <div className="mt-6 space-y-4">
                {/* Progress Confirmation - Shows for first-time users after first session */}
                {completionSummary && progressCount === 1 && experienceId && (
                  <ProgressConfirmation
                    experienceId={experienceId}
                    nicheLabel={completionSummary.nicheLabel || nicheLabel}
                    progressCount={progressCount}
                    objective={session.objective}
                  />
                )}

                {/* Completion Card */}
                {completionSummary && (
                  <CompletionCard 
                    summary={{
                      ...completionSummary,
                      primaryNiche: completionSummary.primaryNiche,
                      customNiche: completionSummary.customNiche,
                    }}
                    progressCount={progressCount}
                    experienceId={experienceId}
                    niche={completionSummary.primaryNiche || nicheKey}
                    practiceMode={session.practice_preference}
                    objective={session.objective}
                  />
                )}

                {/* Session limit upgrade card */}
                {upgradeContext?.type === "limit" && (
                  <div className="mt-4 rounded-lg border border-gray-a5 bg-gray-a1 p-4 text-3">
                    <div className="font-semibold mb-1">You're making progress 🔥</div>
                    <div className="text-gray-10 mb-3">
                      Free includes 2 drill sets per day. Upgrade to Pro for unlimited drills + scenario + coaching.
                    </div>
                    <div className="flex gap-2">
                      <Button variant="classic" size="2">
                        Upgrade to Pro — $9/month
                      </Button>
                      <Button
                        variant="soft"
                        size="2"
                        onClick={() => setUpgradeContext(null)}
                      >
                        Come back tomorrow
                      </Button>
                    </div>
                  </div>
                )}
                
                {/* Next Actions */}
                <div className="rounded-lg border border-gray-a5 bg-gray-a1 p-4 sm:p-6">
                  <div className="flex flex-col gap-3">
                    <RegenDrillsButton
                      nicheKey={nicheKey}
                      experienceId={experienceId}
                      practiceMode={session.practice_preference}
                      isLimitReached={userPlan === "free" && (session.drillSetsCompleted ?? 0) >= entitlements.maxDrillSetsPerDay}
                      onLimitReached={() => setUpgradeContext({ type: "limit" })}
                      onRegenerateStart={() => {
                        popMicroMsg("Generating a fresh drill set…");
                      }}
                      onDrillsRegenerated={(newDrills) => {
                        // Update local state with new drills and reset progress
                        const updatedSession = {
                          ...session,
                          drills: newDrills,
                          currentIndex: 0,
                          userAnswers: {},
                          selectedOptions: {},
                          evaluations: {},
                        };
                        setSessions((prev) => ({
                          ...prev,
                          [nicheKey]: updatedSession,
                        }));
                        // Reset completion state for new drill set
                        setCompletionPosted(false);
                        setCompletionSummary(null);
                        setProgressCount(0);
                        // Show success message
                        popMicroMsg("New drill set ready ✅");
                      }}
                    />
                    {experienceId && (
                      <ResetSessionModal 
                        experienceId={experienceId} 
                        isUserMadeCustomNiche={
                          nicheKey?.toLowerCase() === "custom" &&
                          typeof customNiche === "string" &&
                          customNiche.trim().length > 0
                        }
                      />
                    )}
                    
                    {/* Continue practice button */}
                    {session.has_more && (
                      <Button
                        size="3"
                        variant="classic"
                        onClick={generateMoreDrills}
                        disabled={loading}
                      >
                        {loading ? "Loading..." : "Continue practice"}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )}
        </div>
      )}

      {!session.drills && !loading && (
        <p className="text-2 text-gray-10">
          Describe what you want to work on above, then click{" "}
          <strong>Start Session</strong> to begin practicing.
        </p>
      )}

      {/* Daily cap modal */}
      {showCapModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-lg">
            <div className="text-lg font-semibold">Daily practice limit reached</div>
            
            <div className="mt-3 text-sm text-gray-600 space-y-3">
              <p>You've been actively practicing today — nice work.</p>
              <p>Free sessions are capped to keep practice focused and intentional.</p>
              <p>You'll get fresh free sessions automatically tomorrow.</p>
              <p>Pro removes session limits, so you can keep practicing while your brain is engaged — not when a timer resets.</p>
            </div>

            <div className="mt-4 text-sm text-gray-700">
              <p className="font-medium mb-2">With Pro, you can:</p>
              <ul className="list-disc list-inside space-y-1 text-gray-600">
                <li>Continue practicing whenever insight hits</li>
                <li>Go deeper when something doesn't click</li>
                <li>Work through real scenarios instead of stopping at answers</li>
                <li>Let sessions adapt to what you struggle with</li>
              </ul>
            </div>

            <div className="mt-4 text-sm text-gray-500">
              <p>Pro is $9/month — cancel anytime.</p>
              <p className="mt-1 text-gray-400">Free resets daily at midnight (local time).</p>
            </div>

            <div className="mt-5 flex flex-col gap-3">
              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  className="text-sm text-gray-500 hover:text-gray-700"
                  onClick={() => setShowCapModal(false)}
                >
                  I'll continue tomorrow
                </button>

                <button
                  type="button"
                  className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                  onClick={() => {
                    // Iframe-safe: open checkout in new tab
                    window.open(PRO_CHECKOUT_URL, "_blank", "noopener,noreferrer");
                  }}
                >
                  Continue with Pro
                </button>
              </div>

              <button
                type="button"
                className="text-xs text-gray-400 hover:text-gray-600 text-center"
                onClick={refreshProStatus}
              >
                Already upgraded? Refresh status
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pro thank you modal (shown once) */}
      {showThankYou && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-lg text-center">
            <div className="text-2xl mb-2">✅</div>
            <div className="text-lg font-semibold">You're all set — Pro unlocked</div>
            <div className="mt-2 text-sm text-gray-600">
              Your sessions are now unlimited.
            </div>
            <div className="mt-5">
              <Button
                type="button"
                onClick={() => setShowThankYou(false)}
              >
                Let's go
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

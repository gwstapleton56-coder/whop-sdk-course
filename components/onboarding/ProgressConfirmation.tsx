/**
 * ProgressConfirmation - Shows after first session completion
 * Reinforces what user has gained, uses "You're on track" language
 * Creates momentum and emotional commitment before Pro offer
 */
"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, TrendingUp, Sparkles } from "lucide-react";
import { Button } from "@whop/react/components";
import { getOnboardingState, setOnboardingState, completeOnboardingStep } from "@/lib/onboarding";
import { useRouter } from "next/navigation";

export function ProgressConfirmation({
  experienceId,
  nicheLabel,
  progressCount,
  objective,
  onContinue,
}: {
  experienceId: string;
  nicheLabel: string;
  progressCount: number;
  objective?: string | null;
  onContinue?: () => void;
}) {
  const router = useRouter();
  const [isVisible, setIsVisible] = useState(false);
  const [showProTransition, setShowProTransition] = useState(false);

  useEffect(() => {
    // Check if user just completed their first session
    const state = getOnboardingState();
    if (state.step === "first_session_complete" || (state.step === "progress_confirmed" && !showProTransition)) {
      setIsVisible(true);
      
      // After a brief delay, show Pro transition if user hasn't seen it yet
      if (state.step === "first_session_complete") {
        const timer = setTimeout(() => {
          setShowProTransition(true);
        }, 2000);
        return () => clearTimeout(timer);
      }
    }
  }, []);

  function handleContinue() {
    completeOnboardingStep("progress_confirmed"); // Advances to "pro_offered"
    setIsVisible(false);
    if (onContinue) {
      onContinue();
    }
  }

  function handleUpgrade() {
    completeOnboardingStep("progress_confirmed"); // Advances to "pro_offered"
    router.push(`/experiences/${experienceId}/upgrade`);
  }

  if (!isVisible) return null;

  return (
    <div className="mb-6 rounded-2xl border border-green-a5 bg-green-a1 p-8 sm:p-10" style={{
      boxShadow: '0 4px 6px -1px rgba(34, 197, 94, 0.15), 0 2px 4px -2px rgba(34, 197, 94, 0.1)',
    }}>
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className="flex-shrink-0">
          <div className="h-14 w-14 rounded-xl bg-green-11 flex items-center justify-center" style={{
            boxShadow: '0 2px 4px 0 rgba(34, 197, 94, 0.2)',
          }}>
            <CheckCircle2 className="h-7 w-7 text-white" />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h2 className="text-5 font-bold text-gray-12 mb-3">
            You're on track 🎯
          </h2>
          <p className="text-4 text-gray-11 leading-relaxed mb-4">
            Great work on your first session! You've taken the first step toward 
            building stronger decision-making skills in <span className="font-semibold text-gray-12">{nicheLabel}</span>.
          </p>

          {/* Progress Highlights */}
          <div className="rounded-lg border border-green-a5 bg-gray-a1 p-4 mb-4">
            <div className="text-2 font-semibold text-gray-10 uppercase tracking-wide mb-3">
              What you've accomplished
            </div>
            <ul className="space-y-2 text-3 text-gray-11">
              <li className="flex items-start gap-2">
                <TrendingUp className="h-4 w-4 text-blue-11 mt-0.5 shrink-0" />
                <span>Completed {progressCount} drill{progressCount !== 1 ? 's' : ''} with targeted practice</span>
              </li>
              {objective && (
                <li className="flex items-start gap-2">
                  <Sparkles className="h-4 w-4 text-blue-11 mt-0.5 shrink-0" />
                  <span>Focused on: <span className="font-medium">{objective.toLowerCase()}</span></span>
                </li>
              )}
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-11 mt-0.5 shrink-0" />
                <span>Built momentum and confidence</span>
              </li>
            </ul>
          </div>

          {/* Pro Transition - Shows after delay */}
          {showProTransition && (
            <div className="mt-4 pt-4 border-t border-green-a5">
              <p className="text-3 text-gray-11 mb-4">
                Ready to accelerate your progress? Pro unlocks unlimited sessions, 
                all practice modes, and faster improvement.
              </p>
              <div className="flex items-center gap-3">
                <Button
                  variant="classic"
                  size="3"
                  onClick={handleUpgrade}
                  className="flex-1"
                >
                  Continue with Pro
                </Button>
                <button
                  onClick={handleContinue}
                  className="text-3 text-gray-10 hover:text-gray-12 transition-colors px-3"
                >
                  Keep going free
                </button>
              </div>
            </div>
          )}

          {/* Continue CTA - Shows initially */}
          {!showProTransition && (
            <div className="flex items-center gap-3">
              <Button
                variant="soft"
                size="3"
                onClick={handleContinue}
                className="flex items-center gap-2"
              >
                Continue practicing
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


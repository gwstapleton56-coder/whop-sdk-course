/**
 * OnboardingWelcome - Orientation step for first-time users
 * Shows calm, confidence-building introduction with outcome preview
 */
"use client";

import { useEffect, useState } from "react";
import { Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@whop/react/components";
import { getOnboardingState, setOnboardingState, completeOnboardingStep } from "@/lib/onboarding";

export function OnboardingWelcome({
  experienceId,
  onDismiss,
}: {
  experienceId: string;
  onDismiss?: () => void;
}) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if user should see onboarding
    const state = getOnboardingState();
    if (state.step === "not_started") {
      setIsVisible(true);
    }
  }, []);

  function handleGetStarted() {
    completeOnboardingStep("not_started"); // Advances to "orientation_complete"
    setIsVisible(false);
    if (onDismiss) onDismiss();
  }

  if (!isVisible) return null;

  return (
    <div className="mb-12 rounded-2xl border border-blue-a5 bg-blue-a1 p-8 sm:p-10" style={{
      boxShadow: '0 4px 6px -1px rgba(59, 130, 246, 0.15), 0 2px 4px -2px rgba(59, 130, 246, 0.1)',
    }}>
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className="flex-shrink-0">
          <div className="h-14 w-14 rounded-xl bg-blue-11 flex items-center justify-center" style={{
            boxShadow: '0 2px 4px 0 rgba(59, 130, 246, 0.2)',
          }}>
            <Sparkles className="h-7 w-7 text-white" />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h2 className="text-5 font-bold text-gray-12 mb-3">
            Welcome to Skill Accelerator
          </h2>
          <p className="text-4 text-gray-11 leading-relaxed mb-4">
            Build real decision-making skills through deliberate practice. 
            Choose your focus area, work through targeted drills, and get 
            instant feedback that helps you improve.
          </p>
          
          {/* Outcome Preview */}
          <div className="rounded-lg border border-blue-a5 bg-gray-a1 p-4 mb-4">
            <div className="text-2 font-semibold text-gray-10 uppercase tracking-wide mb-2">
              What you'll achieve
            </div>
            <ul className="space-y-2 text-3 text-gray-11">
              <li className="flex items-start gap-2">
                <span className="text-blue-11 mt-1">•</span>
                <span>Sharper decision-making under pressure</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-11 mt-1">•</span>
                <span>Pattern recognition for your niche</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-11 mt-1">•</span>
                <span>Consistent improvement through practice</span>
              </li>
            </ul>
          </div>

          {/* CTA */}
          <div className="flex items-center gap-3">
            <Button
              variant="classic"
              size="3"
              onClick={handleGetStarted}
              className="flex items-center gap-2"
            >
              Get started
              <ArrowRight className="h-4 w-4" />
            </Button>
            <button
              onClick={handleGetStarted}
              className="text-3 text-gray-10 hover:text-gray-12 transition-colors"
            >
              Skip for now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


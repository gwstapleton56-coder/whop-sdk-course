"use client";

import { useEffect, useState } from "react";
import { Sparkles, Check, ArrowRight } from "lucide-react";
import { Button } from "@whop/react/components";
import { PRO_CHECKOUT_URL } from "@/lib/config";
import { getOnboardingState } from "@/lib/onboarding";

export default function UpgradePage({
  params,
}: {
  params: Promise<{ experienceId: string }>;
}) {
  const [experienceId, setExperienceId] = useState<string | null>(null);
  const [isPro, setIsPro] = useState(false);
  const [loading, setLoading] = useState(true);
  const [onboardingState, setOnboardingState] = useState<any>(null);

  useEffect(() => {
    params.then((p) => setExperienceId(p.experienceId));
  }, [params]);

  useEffect(() => {
    // Load onboarding state for personalized messaging
    if (typeof window !== "undefined") {
      setOnboardingState(getOnboardingState());
    }
  }, []);

  async function refresh() {
    try {
      setLoading(true);
      const res = await fetch("/api/pro/status", { cache: "no-store" });
      const data = await res.json().catch(() => null);
      setIsPro(Boolean(data?.isPro));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  // Personalized messaging based on onboarding progress
  const isFirstTimeUpgrade = onboardingState?.step === "pro_offered" || onboardingState?.step === "progress_confirmed";
  const headline = isFirstTimeUpgrade 
    ? "Continue your momentum" 
    : "Unlock unlimited practice";
  
  const subheadline = isFirstTimeUpgrade
    ? "You're making great progress. Pro unlocks unlimited sessions and faster improvement."
    : "Take your practice to the next level with unlimited drills, all modes, and priority features.";

  if (!experienceId) return null;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Hero Section */}
      <div className="mb-10">
        <h1 className="text-6xl font-bold text-gray-12 mb-4">
          {headline}
        </h1>
        <p className="text-4 text-gray-10 max-w-2xl">
          {subheadline}
        </p>
      </div>

      {/* Main Content Card */}
      <div className="rounded-2xl border border-gray-a5 bg-gray-a1 p-8 sm:p-10 mb-8" style={{
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
      }}>
        {/* Pricing Highlight */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-a1 border border-blue-a5 px-4 py-2 mb-4">
            <Sparkles className="h-4 w-4 text-blue-11" />
            <span className="text-3 font-semibold text-blue-12">$9/month</span>
            <span className="text-2 text-blue-10">• Cancel anytime</span>
          </div>
          <p className="text-3 text-gray-10">
            Less than a coffee per month for unlimited improvement
          </p>
        </div>

        {/* Feature Comparison */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
          {/* Free Tier */}
          <div className="rounded-2xl border border-gray-a5 bg-gray-a1 p-6" style={{
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
          }}>
            <div className="mb-4">
              <h3 className="text-5 font-semibold text-gray-12 mb-1">Free</h3>
              <p className="text-3 text-gray-10">2 drill sets per day</p>
            </div>
            <ul className="space-y-2 text-3 text-gray-11">
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 text-gray-8 mt-0.5 shrink-0" />
                <span>Session objective + adaptive drills</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 text-gray-8 mt-0.5 shrink-0" />
                <span>Save sessions and continue later</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 text-gray-8 mt-0.5 shrink-0" />
                <span>Core practice modes</span>
              </li>
            </ul>
          </div>

          {/* Pro Tier */}
          <div className="rounded-2xl border-2 border-blue-a5 bg-blue-a1 p-6 relative overflow-hidden" style={{
            boxShadow: '0 4px 6px -1px rgba(59, 130, 246, 0.1), 0 2px 4px -2px rgba(59, 130, 246, 0.1)',
          }}>
            <div className="mb-4">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-5 font-semibold text-gray-12">Pro</h3>
                <span className="rounded-full bg-blue-11 text-white px-2.5 py-1 text-2 font-semibold">
                  Recommended
                </span>
              </div>
              <p className="text-3 text-gray-12 font-medium">Unlimited drill sets + full experience</p>
            </div>
            <ul className="space-y-2 text-3 text-gray-12">
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 text-blue-11 mt-0.5 shrink-0" />
                <span className="font-medium">Unlimited sessions + drill sets</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 text-blue-11 mt-0.5 shrink-0" />
                <span className="font-medium">All modes unlocked (scenarios, coaching)</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 text-blue-11 mt-0.5 shrink-0" />
                <span className="font-medium">Faster improvement loop (more reps)</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 text-blue-11 mt-0.5 shrink-0" />
                <span className="font-medium">AI Coach access (personalized coaching & guidance)</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 text-blue-11 mt-0.5 shrink-0" />
                <span className="font-medium">Priority access to new features</span>
              </li>
            </ul>
          </div>
        </div>

        {/* CTA Section */}
        <div className="border-t border-gray-a5 pt-6">
          {isPro ? (
            <div className="text-center">
              <div className="inline-flex items-center gap-2 rounded-full bg-green-a1 border border-green-a5 px-4 py-2 mb-3">
                <Check className="h-4 w-4 text-green-11" />
                <span className="text-3 font-semibold text-green-12">You're already Pro!</span>
              </div>
              <p className="text-3 text-gray-10">
                You have access to all Pro features
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <Button
                variant="classic"
                size="4"
                onClick={() => window.open(PRO_CHECKOUT_URL, "_blank", "noopener,noreferrer")}
                className="w-full"
              >
                Continue with Pro
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
              
              <Button
                variant="soft"
                size="3"
                type="button"
                className="w-full"
                onClick={refresh}
                disabled={loading}
              >
                {loading ? "Checking..." : "I already upgraded — Refresh status"}
              </Button>

              <p className="text-2 text-center text-gray-10">
                Pro unlocks immediately after Whop confirms your access
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Trust Indicators */}
      <div className="text-center">
        <p className="text-3 text-gray-10">
          Trusted by thousands of users • Secure checkout via Whop • Cancel anytime
        </p>
      </div>
    </div>
  );
}

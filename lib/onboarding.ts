/**
 * Onboarding tracking utilities
 * Tracks user progress through the onboarding → Pro conversion funnel
 */

export type OnboardingStep = 
  | "not_started"
  | "orientation_complete"  // User has seen welcome/outcome preview
  | "first_session_started" // User has started their first practice session
  | "first_session_complete" // User has completed their first drill/session
  | "progress_confirmed"     // User has seen their progress/results
  | "pro_offered"           // User has seen Pro offer
  | "completed";            // User has either upgraded or dismissed

const ONBOARDING_STORAGE_KEY = "sa_onboarding_state";

export interface OnboardingState {
  step: OnboardingStep;
  completedAt?: string;
  lastNicheKey?: string;
  firstSessionNiche?: string;
}

/**
 * Get current onboarding state from localStorage
 */
export function getOnboardingState(): OnboardingState {
  if (typeof window === "undefined") {
    return { step: "not_started" };
  }

  try {
    const stored = localStorage.getItem(ONBOARDING_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error("Failed to read onboarding state:", e);
  }

  return { step: "not_started" };
}

/**
 * Update onboarding state in localStorage
 */
export function setOnboardingState(state: Partial<OnboardingState>): void {
  if (typeof window === "undefined") return;

  try {
    const current = getOnboardingState();
    const updated: OnboardingState = {
      ...current,
      ...state,
    };
    localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error("Failed to save onboarding state:", e);
  }
}

/**
 * Mark onboarding step as complete and advance to next step
 */
export function completeOnboardingStep(step: OnboardingStep): void {
  const stepOrder: OnboardingStep[] = [
    "not_started",
    "orientation_complete",
    "first_session_started",
    "first_session_complete",
    "progress_confirmed",
    "pro_offered",
    "completed",
  ];

  const currentIndex = stepOrder.indexOf(step);
  if (currentIndex < stepOrder.length - 1) {
    setOnboardingState({ step: stepOrder[currentIndex + 1] });
  } else {
    setOnboardingState({ step: "completed" });
  }
}

/**
 * Check if user should see onboarding experience
 */
export function shouldShowOnboarding(): boolean {
  const state = getOnboardingState();
  return state.step !== "completed";
}

/**
 * Check if user is a first-time user (no sessions completed)
 */
export function isFirstTimeUser(progressCount: number): boolean {
  return progressCount === 0 && shouldShowOnboarding();
}


export type Plan = "free" | "pro";

export function getEntitlements(plan: Plan) {
  return {
    canUseScenario: plan === "pro",
    canUseCoaching: plan === "pro",
    dailySessions: plan === "pro" ? Infinity : 1,

    // ✅ FREE users can complete 2 drill sets per day/session
    maxDrillSetsPerDay: plan === "pro" ? Infinity : 2,
  };
}



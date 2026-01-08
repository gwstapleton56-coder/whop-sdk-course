export type PracticeMode = "checklist" | "test" | "coaching" | "walkthrough";

export type DrillPlan = {
  mode: PracticeMode;
  targetCount: number;
  chunkSize: number;
  stopRule: "fixed" | "mastery_2_sets_80" | "user_stop" | "scenario_complete";
  rationale: string;
};

export function defaultPlanForMode(mode: string): DrillPlan {
  switch (mode) {
    case "test":
    case "B": // Multiple choice test
      return {
        mode: "test",
        targetCount: 20,
        chunkSize: 10,
        stopRule: "mastery_2_sets_80",
        rationale: "Test mode benefits from enough reps to identify weak areas.",
      };
    case "checklist":
    case "A": // Checklist
      return {
        mode: "checklist",
        targetCount: 1,
        chunkSize: 1,
        stopRule: "fixed",
        rationale: "Checklist mode is best delivered as one actionable plan with checkpoints.",
      };
    case "coaching":
    case "C": // Coaching
      return {
        mode: "coaching",
        targetCount: 6,
        chunkSize: 2,
        stopRule: "user_stop",
        rationale: "Coaching mode works best as a short sequence of targeted prompts with feedback.",
      };
    case "walkthrough":
    case "D": // Walkthrough
      return {
        mode: "walkthrough",
        targetCount: 3,
        chunkSize: 1,
        stopRule: "scenario_complete",
        rationale: "Walkthrough mode works best as a few scenarios, each with steps.",
      };
    default:
      return {
        mode: "test",
        targetCount: 10,
        chunkSize: 5,
        stopRule: "fixed",
        rationale: "Default plan.",
      };
  }
}

export function mapPreferenceToMode(pref: string): PracticeMode {
  switch (pref) {
    case "A":
      return "checklist";
    case "B":
      return "test";
    case "C":
      return "coaching";
    case "D":
      return "walkthrough";
    default:
      return "test";
  }
}






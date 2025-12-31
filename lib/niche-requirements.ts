export type RequiredField = {
  key: "state" | "country" | "testType";
  question: string;
  placeholder?: string;
};

function includesAny(text: string, words: string[]) {
  const t = text.toLowerCase();
  return words.some((w) => t.includes(w));
}

/**
 * Returns ONLY the fields required to generate accurate drills.
 * Keep this conservative (ask the minimum).
 */
export function getRequiredFieldsForNiche(input: {
  nicheKey: string;
  nicheLabel: string;
  aiContext?: string | null;
  customNiche?: string | null;
}): RequiredField[] {
  const text = `${input.nicheKey} ${input.nicheLabel} ${input.aiContext ?? ""} ${input.customNiche ?? ""}`;

  // "Exam / law / licensing / handbook" style niches often need location
  const isStateSpecificExam = includesAny(text, [
    "permit test",
    "driving permit",
    "dmv",
    "driver's test",
    "drivers test",
    "cdl",
    "license test",
    "licensing exam",
    "real estate exam",
    "insurance exam",
    "state exam",
    "handbook",
  ]);

  if (isStateSpecificExam) {
    return [
      {
        key: "state",
        question: "What state are you in? (So I can generate accurate practice questions.)",
        placeholder: "Example: Indiana",
      },
    ];
  }

  // Default: no extra requirements
  return [];
}





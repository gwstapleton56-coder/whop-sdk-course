import { NextResponse } from "next/server";
import { whopsdk } from "@/lib/whop-sdk";
import { headers } from "next/headers";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ experienceId: string }> }
) {
  try {
    const { experienceId } = await params;

    const headerList = await headers();
    await whopsdk.verifyUserToken(headerList);

    const body = await req.json();

    const {
      nicheKey,
      customNiche,
      question,
      prompt,
      rubric,
      greatAnswerExample,
      userAnswer,
    } = body;

    if (!userAnswer?.trim()) {
      return NextResponse.json({ error: "Missing userAnswer" }, { status: 400 });
    }

    // Try to get niche context
    let nicheContext = "";
    try {
      const { getNicheContext } = await import("@/lib/niche-context");
      const ctx = await getNicheContext({
        experienceId,
        nicheKey: nicheKey || "custom",
        customNiche: customNiche || null,
      });
      nicheContext = ctx?.context || "";
    } catch {
      // Continue without niche context
    }

    const system = `
You are a friendly skill coach inside a Whop app called "Skill Accelerator".

Classify the user's answer into one of three categories: "strong", "close", or "wrong".

Classification rules:
1. "strong" = User understands the core concept and reasoning. Acknowledge success, give 1-2 optional refinements, NO example answer.
2. "close" = User has the main idea but is missing clarity or a key detail. Say "You're on the right track", clearly state what's missing (bullets), NO example answer.
3. "wrong" = User missed or misunderstood the core concept. Brief explanation of what went wrong, SHOW an example of a strong answer, encourage retry.

Return JSON ONLY with this shape:
{
  "score": number (0-100),
  "verdict": "strong" | "close" | "wrong",
  "feedback": string (concise bullets or short paragraph),
  "improvedAnswer": string (ONLY include if verdict === "wrong", otherwise empty string)
}

CRITICAL: Only include "improvedAnswer" when verdict is "wrong". For "strong" or "close", set improvedAnswer to "".
Keep feedback scannable and coach-like, not teacher-y.
`;

    const user = `
Niche: ${customNiche ? `Custom: ${customNiche}` : nicheKey || "general"}
Context: ${nicheContext || "(none)"}

Scenario prompt: ${prompt ?? "(none)"}
Question: ${question || "(none)"}

Rubric:
${(rubric ?? []).map((r: string, i: number) => `${i + 1}. ${r}`).join("\n") || "(no rubric provided)"}

Great answer example:
${greatAnswerExample ?? "(none)"}

User answer:
${userAnswer}
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      temperature: 0.4,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      response_format: { type: "json_object" },
    });

    const raw = completion.choices[0].message.content || "{}";
    let json: any;
    try {
      json = JSON.parse(raw);
    } catch {
      json = {};
    }

    // Ensure verdict is one of our three categories
    const verdict = ["strong", "close", "wrong"].includes(json.verdict) 
      ? json.verdict 
      : (json.score >= 70 ? "strong" : json.score >= 40 ? "close" : "wrong");
    
    // Only include improvedAnswer for "wrong" verdicts
    const improvedAnswer = verdict === "wrong" ? (json.improvedAnswer ?? "") : "";

    return NextResponse.json({
      score: json.score ?? 0,
      verdict,
      feedback: json.feedback ?? "Try again with more detail.",
      improvedAnswer,
    });
  } catch (error: any) {
    console.error("evaluate-open error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to evaluate answer" },
      { status: 500 }
    );
  }
}



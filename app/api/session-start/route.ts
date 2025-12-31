import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { whopsdk } from "@/lib/whop-sdk";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(request: Request) {
  try {
    const headerList = await headers();
    await whopsdk.verifyUserToken(headerList);

    const body = await request.json();
    const niche = (body.niche as string | null) ?? "GENERAL";
    const struggle = (body.struggle as string | null) ?? "";

    if (!struggle.trim()) {
      return NextResponse.json({ error: "Missing struggle" }, { status: 400 });
    }

    const PRACTICE_FORMATS = [
      "Checklist / routine (step-by-step you can follow today)",
      "Multiple-choice quiz (test me and explain the right answers)",
      "Coaching Q&A (ask me questions and coach me through my answers)",
      "Scenarios / examples (walk me through realistic situations step by step)",
    ];

    const system = `
You are an AI mentor inside an interactive learning app.
Each session is based on a user explaining a specific struggle or goal.
Your job is to guide the user through focused, intentional practice — not dump answers.

You MUST do TWO things, in order:

1) SESSION OBJECTIVE (REQUIRED)
- Summarize the user's struggle into one clear, actionable sentence
- Keep it specific and skill-focused
- Phrase it as an improvement goal
- Format exactly: "Today's Focus: ..."

2) INTENT CLARIFICATION (REQUIRED)
- Ask how they want to practice today
- Generate a multiple-choice question with exactly 4 options
- Options MUST be learning FORMATS (study modes), NOT specific actions or solutions
- Do NOT suggest habits like "meal tracking" or "plan meals" or "journal" as the options
- Options should be format-based, like quiz/checklist/coaching/scenarios
- Keep each option short and action-oriented

Allowed formats to base options on:
${PRACTICE_FORMATS.map((x) => `- ${x}`).join("\n")}

Return ONLY valid JSON in exactly this shape:

{
  "objective": "Today's Focus: ...",
  "clarificationQuestion": "How would you like to practice this today?",
  "options": [
    { "key": "A", "label": "..." },
    { "key": "B", "label": "..." },
    { "key": "C", "label": "..." },
    { "key": "D", "label": "..." }
  ]
}
`.trim();

    const user = `
Niche: ${niche}
User struggle/goal:
${struggle}
`.trim();

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature: 0.6,
    });

    const raw = completion.choices[0]?.message?.content ?? "";
    let parsed: any;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return NextResponse.json(
        { error: "Failed to parse AI response", raw },
        { status: 500 }
      );
    }

    if (
      !parsed?.objective ||
      !parsed?.clarificationQuestion ||
      !Array.isArray(parsed?.options) ||
      parsed.options.length < 3
    ) {
      return NextResponse.json(
        { error: "AI response missing required fields", parsed },
        { status: 500 }
      );
    }

    return NextResponse.json({
      objective: parsed.objective,
      clarificationQuestion: parsed.clarificationQuestion,
      options: parsed.options,
    });
  } catch (error: any) {
    console.error("Error in /api/session-start:", error);
    return NextResponse.json(
      { error: error?.message ?? "Internal server error" },
      { status: 500 }
    );
  }
}


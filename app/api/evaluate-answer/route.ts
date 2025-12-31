import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { whopsdk } from "@/lib/whop-sdk";
import OpenAI from "openai";

if (!process.env.OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY is not set in environment variables");
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    const headerList = await headers();

    // Make sure this is a real logged-in Whop user
    await whopsdk.verifyUserToken(headerList);

    const body = await request.json();
    const {
      niche,
      question,
      correctAnswer,
      explanation,
      userAnswer,
    } = body as {
      niche?: string | null;
      question: string;
      correctAnswer: string;
      explanation?: string;
      userAnswer: string;
    };

    if (!question || !correctAnswer || !userAnswer) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const nicheLabel = niche ?? "GENERAL";

    const systemPrompt = `
You are a friendly skill coach inside a Whop app called "Skill Accelerator".

Your job:
- Classify the user's answer into one of three categories: "strong", "close", or "wrong"
- Be encouraging and concise, not teacher-y or long-winded
- Give fast positive reinforcement when they're doing well
- Only provide detailed correction when they're clearly wrong

Classification rules:
1. "strong" = User understands the core concept and reasoning. Acknowledge success, give 1-2 optional refinements, NO example answer.
2. "close" = User has the main idea but is missing clarity or a key detail. Say "You're on the right track", clearly state what's missing (bullets), NO example answer.
3. "wrong" = User missed or misunderstood the core concept. Brief explanation of what went wrong, SHOW an example of a strong answer, encourage retry.

Return ONLY valid JSON with this shape:
{
  "verdict": "strong" | "close" | "wrong",
  "headline": string (short, coach-like),
  "coaching": string (concise bullets or short paragraph),
  "improvedAnswer": string (ONLY include if verdict === "wrong", otherwise empty string)
}

CRITICAL: Only include "improvedAnswer" when verdict is "wrong". For "strong" or "close", set improvedAnswer to "".
`.trim();

    const userPrompt = `
Niche: ${nicheLabel}

Question:
${question}

Ideal/Correct answer:
${correctAnswer}

Extra explanation (if any):
${explanation ?? "N/A"}

User's answer:
${userAnswer}

Evaluate the user's answer:
- If they understand the core concept → verdict: "strong" (acknowledge, 1-2 refinements, NO example)
- If they're on track but missing details → verdict: "close" (encourage, state what's missing, NO example)
- If they misunderstood or missed the concept → verdict: "wrong" (brief explanation, SHOW example)

Keep feedback scannable: short paragraphs or bullets. Be a coach, not a grader.
`.trim();

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
    });

    const raw = completion.choices[0]?.message?.content ?? "";
    let data: any;

    try {
      data = JSON.parse(raw);
    } catch (err) {
      console.error("Failed to parse evaluation JSON:", raw);
      return NextResponse.json(
        { error: "Failed to parse AI evaluation" },
        { status: 500 },
      );
    }

    if (
      !data ||
      !["strong", "close", "wrong"].includes(data.verdict)
    ) {
      return NextResponse.json(
        { error: "Invalid evaluation result from AI" },
        { status: 500 },
      );
    }

    // Ensure improvedAnswer is only present for "wrong" verdicts
    if (data.verdict !== "wrong") {
      data.improvedAnswer = "";
    }

    return NextResponse.json({
      verdict: data.verdict,
      headline: data.headline,
      coaching: data.coaching,
      improvedAnswer: data.improvedAnswer,
    });
  } catch (error) {
    console.error("Error in /api/evaluate-answer:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

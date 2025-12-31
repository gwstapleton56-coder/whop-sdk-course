import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { whopsdk } from "@/lib/whop-sdk";
import { prisma } from "@/lib/db";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: Request) {
  try {
    const { userId } = await whopsdk.verifyUserToken(await headers());
    const body = await req.json().catch(() => null);

    const nicheKey = body?.nicheKey;
    if (!nicheKey) {
      return NextResponse.json({ error: "Missing nicheKey" }, { status: 400 });
    }

    // Load the existing saved session from DB (source of truth)
    const session = await prisma.practiceSession.findUnique({
      where: { whopUserId_nicheKey: { whopUserId: userId, nicheKey } },
    });

    if (!session) {
      return NextResponse.json(
        { error: "No active session found. Start a new session first." },
        { status: 400 }
      );
    }

    const sessionData = session.data as any;

    // Debug: log session snapshot to identify field issues
    console.log("REGENERATE session snapshot:", {
      id: session?.id,
      nicheKey,
      struggle: sessionData?.struggle,
      objective: sessionData?.objective,
      practice_preference: sessionData?.practice_preference,
      allKeys: Object.keys(sessionData || {}),
    });

    const struggle = sessionData?.struggle?.trim();
    const objective = sessionData?.objective?.trim();
    const practice_preference = sessionData?.practice_preference?.trim();

    if (!struggle || !objective || !practice_preference) {
      console.error("REGENERATE validation failed:", {
        hasStruggle: !!struggle,
        hasObjective: !!objective,
        hasPracticePreference: !!practice_preference,
        rawStruggle: sessionData?.struggle,
        rawObjective: sessionData?.objective,
        rawPracticePreference: sessionData?.practice_preference,
      });
      return NextResponse.json(
        { error: "Session missing required fields (struggle, objective, or practice_preference)" },
        { status: 400 }
      );
    }

    // Generate a NEW drill set using the SAME session context
    const nicheLabel = nicheKey.startsWith("CUSTOM:")
      ? nicheKey.replace("CUSTOM:", "")
      : nicheKey;

    const system = `
You are an AI mentor generating drills for an interactive learning app.

FLOW CONTEXT:
- The user already provided a struggle.
- You already generated a Session Objective.
- The user selected a practice preference option.

REQUIREMENTS:
- Generate exactly 3 drills.
- Drills MUST align with:
  (a) the Session Objective
  (b) the selected practice preference
- Each drill focuses on ONE skill.
- Difficulty increases slightly from Drill 1 → Drill 3.
- Avoid long lectures; drills must be interactive and executable.

QUESTION TYPES:
- Use "multiple_choice" when it makes sense (4 options, 1 correct).
- Use "open" for typed responses / coaching.
- Keep UI-friendly and concise.

OUTPUT JSON SCHEMA (ONLY JSON):
{
  "drills": [
    {
      "id": "drill-1",
      "question": "string",
      "questionType": "open" | "multiple_choice",
      "options": ["A","B","C","D"],            // only for multiple_choice
      "correctOptionIndex": 0,                 // only for multiple_choice (0–3)
      "correctAnswer": "string",
      "explanation": "string"
    }
  ]
}

PREFERENCE MAPPING (IMPORTANT):
The user's selected option may imply these formats:

- If preference is checklist-style:
  - Drill 1: simple checklist
  - Drill 2: checklist + decision points
  - Drill 3: checklist + self-reflection prompts
  (Represent checklists inside "explanation" using short bullet lines.)

- If preference is test-style:
  - More multiple_choice drills
  - Drill 3 should be scenario-based

- If preference is coaching-style:
  - More open drills with guided coaching tone
  - Provide short correction + improved answer

TONE:
Supportive mentor. Make the user feel progress even if wrong.
`.trim();

    const userContent = `
Niche: ${nicheLabel}
User struggle: ${struggle}
Session objective: ${objective}
Practice preference selected: ${practice_preference}

Generate 3 NEW drills now. Make them different from previous drills while still aligning with the objective and preference. Vary the questions and scenarios to provide fresh practice.
`.trim();

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        { role: "system", content: system },
        { role: "user", content: userContent },
      ],
      temperature: 0.8,
    });

    const raw = completion.choices[0]?.message?.content ?? "";
    let json: any;
    try {
      json = JSON.parse(raw);
    } catch (err) {
      console.error("Failed to parse AI JSON:", raw);
      return NextResponse.json(
        { error: "Failed to parse AI response" },
        { status: 500 }
      );
    }

    if (!json || !Array.isArray(json.drills)) {
      return NextResponse.json(
        { error: "AI response missing drills" },
        { status: 500 }
      );
    }

    // Save new drills + reset drill progress
    // IMPORTANT: Preserve all session context fields (struggle, objective, practice_preference, clarification)
    // Only update drills and progress-related fields
    const updatedData = {
      ...sessionData,
      // Preserve session context (never clear these)
      struggle: sessionData.struggle,
      objective: sessionData.objective,
      practice_preference: sessionData.practice_preference,
      clarification: sessionData.clarification,
      // Update drills and reset progress
      drills: json.drills,
      currentIndex: 0,
      userAnswers: {},
      selectedOptions: {},
      evaluations: {},
    };

    const updated = await prisma.practiceSession.update({
      where: { whopUserId_nicheKey: { whopUserId: userId, nicheKey } },
      data: {
        data: updatedData,
      },
    });

    return NextResponse.json({
      ok: true,
      session: {
        id: updated.id,
        drills: json.drills,
        currentIndex: 0,
      },
    });
  } catch (err: any) {
    console.error("regenerate error:", err);
    return NextResponse.json({ error: err?.message || "Server error" }, { status: 500 });
  }
}


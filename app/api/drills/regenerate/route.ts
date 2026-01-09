import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { whopsdk } from "@/lib/whop-sdk";
import { prisma } from "@/lib/db";
import type { Niche } from "@prisma/client";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function hasRequiredSessionFields(sessionData: any) {
  return Boolean(
    sessionData?.struggle?.trim() &&
      sessionData?.objective?.trim() &&
      sessionData?.practice_preference?.trim(),
  );
}

export async function POST(req: Request) {
  try {
    const { userId } = await whopsdk.verifyUserToken(await headers());
    const body = await req.json();
    const nicheKey = body?.nicheKey as string | undefined;
    const experienceId = body?.experienceId as string | undefined;

    if (!nicheKey) {
      return NextResponse.json({ error: "Missing nicheKey" }, { status: 400 });
    }

    // Find the session
    // @ts-ignore - Prisma types are correct, IDE may show false positives until TS server restarts
    const session = await prisma.practiceSession.findUnique({
      where: { whopUserId_nicheKey: { whopUserId: userId, nicheKey } },
    });

    if (!session) {
      return NextResponse.json(
        { error: "No session found. Start a session first." },
        { status: 400 }
      );
    }

    const sessionData = session.data as any;

    // ✅ Choose source of truth: session fields if valid, else last drillset snapshot
    let ctx:
      | {
          struggle: string;
          objective: string;
          practicePreference: string;
          nicheKey: string;
          customNiche: string | null;
        }
      | null = null;

    if (hasRequiredSessionFields(sessionData)) {
      const isCustom = nicheKey.startsWith("CUSTOM:");
      ctx = {
        struggle: sessionData.struggle.trim(),
        objective: sessionData.objective.trim(),
        practicePreference: sessionData.practice_preference.trim(),
        nicheKey: nicheKey,
        customNiche: isCustom ? nicheKey.replace("CUSTOM:", "") : null,
      };
    } else {
      // Fall back to last DrillSet snapshot
      // @ts-ignore - Prisma types are correct, IDE may show false positives until TS server restarts
      const last = await prisma.drillSet.findFirst({
        where: { sessionId: session.id },
        orderBy: { createdAt: "desc" },
      });

      if (!last) {
        return NextResponse.json(
          { error: "Session missing fields and no prior drill set exists." },
          { status: 400 }
        );
      }

      ctx = {
        struggle: last.struggle,
        objective: last.objective,
        practicePreference: last.practicePreference,
        nicheKey: last.nicheKey,
        customNiche: last.customNiche ?? null,
      };
    }

    // ✅ Generate next drills (same struggle/objective/preference; new questions)
    // Load niche context using new preset system
    const effectiveNicheKey = ctx.nicheKey.replace("CUSTOM:", "custom");
    const nicheContext = experienceId
      ? await import("@/lib/niche-context").then(m => 
          m.getNicheContext({
            experienceId,
            nicheKey: effectiveNicheKey,
            customNiche: ctx.customNiche,
          })
        ).catch(() => ({ label: effectiveNicheKey, context: "Use practical examples and focused training drills.", preset: null }))
      : { label: effectiveNicheKey, context: "Use practical examples and focused training drills.", preset: null };

    const nicheContextBlock = `
Niche label: ${nicheContext.label}
Niche context: ${nicheContext.context}

IMPORTANT:
- Treat this niche label as the source of truth.
- Adapt examples, wording, and drills to match this niche.
- If the niche label implies a specific domain, use that domain's terminology.
`;

    const system = `
You are an AI mentor inside an interactive learning app.
Your job is to guide the user through focused, intentional practice (not dumping answers).

${nicheContextBlock}

Follow the required flow:
1) Session Objective (already provided)
2) Practice preference (already chosen)
3) Generate 3 drills aligned with objective + preference
Increase difficulty slightly from Drill 1 → Drill 3.
Be supportive, concise, and explain mistakes constructively.

REQUIREMENTS:
- Generate exactly 3 drills.
- Drills MUST align with:
  (a) the Session Objective
  (b) the selected practice preference
  (c) the niche context above
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
Niche: ${nicheContext.label}
User struggle: ${ctx.struggle}
Session objective: ${ctx.objective}
Practice preference selected: ${ctx.practicePreference}

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

    // Create new DrillSet with snapshot
    // @ts-ignore - Prisma types are correct, IDE may show false positives until TS server restarts
    const newSet = await prisma.drillSet.create({
      data: {
        sessionId: session.id,
        struggle: ctx.struggle,
        objective: ctx.objective,
        practicePreference: ctx.practicePreference,
        nicheKey: ctx.nicheKey,
        customNiche: ctx.customNiche,
        drillsJson: json.drills,
      },
    });

    // Update session with new drills and reset progress
    const updatedData = {
      ...sessionData,
      // Preserve session context
      struggle: ctx.struggle,
      objective: ctx.objective,
      practice_preference: ctx.practicePreference,
      clarification: sessionData.clarification,
      // Update drills and reset progress
      drills: json.drills,
      currentIndex: 0,
      userAnswers: {},
      selectedOptions: {},
      evaluations: {},
    };

    // @ts-ignore - Prisma types are correct, IDE may show false positives until TS server restarts
    await prisma.practiceSession.update({
      where: { id: session.id },
      data: {
        data: updatedData,
      },
    });

    return NextResponse.json({
      ok: true,
      session: {
        id: session.id,
        drills: json.drills,
        currentIndex: 0,
      },
    });
  } catch (err: any) {
    console.error("REGENERATE_ERROR", err);
    return NextResponse.json(
      { error: err?.message || "Failed to regenerate drill set" },
      { status: 500 }
    );
  }
}


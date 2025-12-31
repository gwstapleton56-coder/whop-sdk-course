import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { whopsdk } from "@/lib/whop-sdk";
import { prisma } from "@/lib/db";
import OpenAI from "openai";
import { defaultPlanForMode, mapPreferenceToMode } from "@/lib/drill-plan";
import { PRO_PRODUCT_ID } from "@/lib/config";

if (!process.env.OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY is not set in environment variables");
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// helper
function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function POST(request: Request) {
  try {
    const headerList = await headers();
    // Ensure user is logged in on Whop.
    let userId: string;
    try {
      const authResult = await whopsdk.verifyUserToken(headerList);
      userId = authResult.userId;
    } catch (authError: any) {
      console.error("[generate-drills] Auth failed:", authError?.message || authError);
      return NextResponse.json(
        { error: "UNAUTHORIZED", message: "Missing or invalid Whop auth context" },
        { status: 403 }
      );
    }

    // ✅ Check Pro status from Whop (same logic as /api/pro/status)
    let userPlan: "free" | "pro" = "free";
    try {
      const access = await whopsdk.users.checkAccess(PRO_PRODUCT_ID, { id: userId });
      userPlan = access?.has_access === true ? "pro" : "free";
      console.log(`[generate-drills] User ${userId} plan: ${userPlan}`, { hasAccess: access?.has_access });
    } catch (err) {
      console.error("Failed to check Pro status, defaulting to free:", err);
      userPlan = "free";
    }

    // ✅ Server-side FREE limit enforcement (2 drill sets/day GLOBAL)
    if (userPlan === "free") {
      const completedToday = await prisma.progressEvent.count({
        where: {
          whopUserId: userId,
          createdAt: { gte: startOfToday() },
        },
      });

      if (completedToday >= 2) {
        console.error("[generate-drills] 403 reason: FREE_LIMIT", {
          reason: "FREE_LIMIT",
          userId,
          completedToday,
          limit: 2,
          userPlan,
        });
        return NextResponse.json(
          {
            error: "FREE_LIMIT",
            message: "Free includes 2 drill sets per day. Upgrade to Pro for unlimited drills.",
            limit: 2,
            completedToday,
          },
          { status: 403 }
        );
      }
    }

    const body = await request.json();
    const niche = (body.niche as string | null) ?? null;
    const nicheKey = (body.nicheKey as string | null) ?? null;
    const experienceId = (body.experienceId as string | null) ?? null;
    const struggle = (body.struggle as string | null) ?? body.prompt ?? null;
    const objective = (body.objective as string | null) ?? null;
    let practice_preference = (body.practice_preference as string | null) ?? null;
    const cursor = (body.cursor as string | null) ?? null;
    const existing_count = Number(body.existing_count ?? 0);
    const session_signals = body.session_signals ?? null;
    const checklistSetup = body.checklistSetup ?? null;

    // Normalize mode name
    if (practice_preference === "scenarios") practice_preference = "walkthrough";

    // ✅ CHECKLIST MODE (Option A) - special handling
    if (practice_preference === "A" || practice_preference === "checklist") {
      const setup = checklistSetup || {};
      const missingSetup = !setup.goal || !setup.location || !setup.constraints || !setup.level;

      if (missingSetup) {
        // Phase 1: return setup questions
        return NextResponse.json({
          drillset: {
            kind: "checklist_setup",
            title: "Quick setup (30 seconds)",
            questions: [
              {
                id: "goal",
                label: "What is the exact outcome you want from this checklist?",
                placeholder: "Ex: Find 3 qualified properties this week…",
              },
              {
                id: "location",
                label: "What location/market does this apply to?",
                placeholder: "City/State/Country (or N/A if it doesn't matter)",
              },
              {
                id: "constraints",
                label: "Any constraints we must follow?",
                placeholder: "Budget, time, rules, tools you have, deadlines…",
              },
              {
                id: "level",
                label: "Your skill level?",
                placeholder: "Beginner / Intermediate / Advanced",
              },
            ],
          },
        });
      }

      // Phase 2: generate a guided, step-by-step checklist plan
      const resolvedNiche = body.customNiche?.trim() ? body.customNiche : (niche || nicheKey);

      const checklistSystem = `
You are an expert coach that builds operational checklists.
Return JSON ONLY. No markdown.
Goal: create a step-by-step guided checklist builder.

Rules:
- Do NOT dump a giant checklist.
- Create 8–14 steps.
- Each step must be:
  - short title
  - action instruction (one step)
  - what "done" looks like (definition of done)
  - a short tip (optional)
- Make steps realistic and ordered.
- Output must match the schema exactly.
Schema:
{
  "kind": "checklist_builder",
  "title": string,
  "nicheDisplay": string,
  "steps": [
    {
      "id": string,
      "title": string,
      "instruction": string,
      "definitionOfDone": string,
      "tip": string | null
    }
  ]
}
`;

      const checklistUser = `
Niche: ${resolvedNiche}
Objective: ${objective || struggle}

Setup context:
- Goal: ${setup.goal}
- Location/Market: ${setup.location}
- Constraints: ${setup.constraints}
- Skill level: ${setup.level}

Now produce the checklist builder JSON.
`;

      const checklistCompletion = await openai.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: [
          { role: "system", content: checklistSystem },
          { role: "user", content: checklistUser },
        ],
        temperature: 0.7,
        response_format: { type: "json_object" },
      });

      const checklistRaw = checklistCompletion.choices[0]?.message?.content ?? "{}";
      let checklistParsed: any;
      try {
        checklistParsed = JSON.parse(checklistRaw);
      } catch {
        return NextResponse.json(
          { error: "AI returned invalid JSON for checklist", raw: checklistRaw },
          { status: 500 }
        );
      }

      return NextResponse.json({ drillset: checklistParsed });
    }

    // Validate required fields for non-checklist modes
    if (!struggle) {
      return NextResponse.json(
        { error: "Missing struggle" },
        { status: 400 },
      );
    }

    if (!objective) {
      return NextResponse.json(
        { error: "Missing objective" },
        { status: 400 },
      );
    }

    if (!practice_preference) {
      return NextResponse.json(
        { error: "Missing practice_preference" },
        { status: 400 },
      );
    }

    // C-step #2: Save session context before generating drills
    if (nicheKey) {
      try {
        const existing = await prisma.practiceSession.findUnique({
          where: { whopUserId_nicheKey: { whopUserId: userId, nicheKey } },
        });

        const existingData = (existing?.data as any) ?? {};

        const updatedData = {
          ...existingData,
          struggle,
          objective,
          practice_preference,
        };

        await prisma.practiceSession.upsert({
          where: { whopUserId_nicheKey: { whopUserId: userId, nicheKey } },
          update: { data: updatedData },
          create: {
            whopUserId: userId,
            nicheKey,
            data: updatedData,
          },
        });
      } catch (err) {
        console.error("Failed to save session context before generating drills:", err);
        // Continue with drill generation even if context save fails
      }
    }

    // Load niche context using new preset system
    const effectiveNicheKey = nicheKey || niche || "custom";
    const customNicheValue = effectiveNicheKey.startsWith("CUSTOM:") 
      ? effectiveNicheKey.replace("CUSTOM:", "") 
      : (effectiveNicheKey === "custom" ? body.customNiche : null);
    
    const nicheContext = experienceId
      ? await import("@/lib/niche-context").then(m => 
          m.getNicheContext({
            experienceId,
            nicheKey: effectiveNicheKey.replace("CUSTOM:", "custom"),
            customNiche: customNicheValue,
          })
        ).catch(() => ({ label: effectiveNicheKey, context: "Use practical examples and focused training drills.", preset: null }))
      : { label: effectiveNicheKey, context: "Use practical examples and focused training drills.", preset: null };

    // Load niche profile for smart context (state, country, testType)
    let nicheProfileBlock = "";
    if (experienceId) {
      try {
        // @ts-ignore
        const profile = await (prisma as any).userNicheProfile.findUnique({
          where: {
            experienceId_whopUserId_nicheKey_customNiche: {
              experienceId,
              whopUserId: userId,
              nicheKey: effectiveNicheKey.replace("CUSTOM:", "custom"),
              customNiche: customNicheValue || "",
            },
          },
        });

        if (profile?.state) {
          nicheProfileBlock = `
User's location: ${profile.state}${profile.country ? `, ${profile.country}` : ""}
${profile.testType ? `Test type: ${profile.testType}` : ""}

IMPORTANT: Generate practice questions aligned to ${profile.state} rules/handbook topics. These are practice questions, not official DMV text. Provide correct answer + short explanation.
`;
        }
      } catch (err) {
        console.error("Failed to load niche profile:", err);
      }
    }

    const nicheContextBlock = `
Niche label: ${nicheContext.label}
Niche context: ${nicheContext.context}
${nicheProfileBlock}
IMPORTANT:
- Treat this niche label as the source of truth.
- Adapt examples, wording, and drills to match this niche.
- If the niche label implies a specific domain, use that domain's terminology.
`;

    // Determine drill plan and chunk size
    const isContinuation = Boolean(cursor);
    const mode = mapPreferenceToMode(practice_preference!);
    const drill_plan = defaultPlanForMode(practice_preference!);
    
    // Check if this is scenario mode (needed for prompt generation)
    const isScenarioMode = practice_preference === "D" || practice_preference === "walkthrough" || practice_preference === "scenarios";
    
    const chunkSize = drill_plan.chunkSize;
    const remaining = Math.max(drill_plan.targetCount - existing_count, 0);
    const generateCount = mode === "checklist" || mode === "walkthrough" 
      ? 1 
      : Math.min(chunkSize, remaining > 0 ? remaining : chunkSize);

    const system = `
You are an AI mentor inside an interactive learning app.
Your job is to guide the user through focused, intentional practice (not dumping answers).

${nicheContextBlock}

Return ONLY valid JSON with this exact shape:

{
  "drill_plan": { "mode": "checklist|test|coaching|walkthrough", "targetCount": number, "chunkSize": number, "stopRule": "...", "rationale": string },
  "drills": [ ... ],
  "has_more": boolean,
  "next_cursor": string|null
}

Rules:
- Do NOT cap at 3. Generate exactly ${generateCount} item(s) for this chunk.
- Keep content concise and UI-friendly.
- For "test": produce MCQ items with id, question, questionType: "multiple_choice", options (array of 4 strings), correctOptionIndex (0-3), correctAnswer, explanation.
- For "checklist": produce 1 checklist with title, items (array of strings), and checkpoints.
- For "coaching": produce prompts with id, question, questionType: "open", correctAnswer, explanation.
- For "walkthrough": produce 1 scenario with steps.
- If niche is exam/state dependent and we have state in profile, tailor questions to that state.

PREFERENCE MAPPING:
- A = checklist: one actionable plan with checkpoints
- B = test: multiple choice questions, realistic and practical
- C = coaching: open-ended prompts with guided coaching tone
- D = walkthrough/scenarios: scenario-based with steps

SCENARIO/WALKTHROUGH RULES (CRITICAL - MUST FOLLOW EXACTLY):
If practice_preference is "D", "scenarios", or "walkthrough":
- Every drill MUST be a structured scenario with concrete details
- Format each drill as:
  {
    "id": "drill-X",
    "kind": "scenario",
    "scenario": "You're [specific role/situation]. [2-6 sentences with concrete details: numbers, platform names, timeframes, metrics, audience, budget, current state]. [Decision point: what happens now that requires action].",
    "contextBullets": ["Fact 1 about the situation", "Fact 2", "Fact 3"],
    "constraints": ["Constraint 1 (platform/time/budget)", "Constraint 2"],
    "question": "[Specific question that references scenario details - NOT generic like 'What should you do next?']",
    "questionType": "open",
    "evaluation": {
      "type": "open",
      "rubric": ["Criterion 1 (specific to scenario)", "Criterion 2", "Criterion 3-6"],
      "greatAnswerExample": "A strong answer would [reference specific scenario details]..."
    },
    "correctAnswer": "Model answer that references scenario specifics",
    "explanation": "Why this approach works in this specific situation"
  }

SCENARIO VALIDATION REQUIREMENTS (MANDATORY):
- "scenario" field MUST be >= 200 characters
- "scenario" MUST contain at least 2 specific details from: numbers, platform names, timeframes, metrics, audience, budget, current state
- "scenario" MUST be written in second person ("You're managing...", "You have...")
- "question" MUST reference specific entities/details from the scenario (NOT generic like "What should you do next?" or "Explain your reasoning")
- "question" MUST be specific to the scenario context
- Scenario MUST be tailored to the niche AND the user's stated struggle/objective

REJECT these generic question patterns:
- "What should you do next"
- "What would you do"
- "Explain your reasoning"
- "How would you handle this"
(Unless the scenario contains enough specific context to make the question meaningful)

EXAMPLE GOOD SCENARIO:
{
  "scenario": "You're managing a TikTok account for a fitness brand. You've been posting 3x/week for 6 months. Your best-performing video got 85k views (hook: '3 exercises that changed my life'). Your average views are 12k. Your goal is 100k views/month. You just posted a video 2 days ago that only got 3k views (hook: 'Why I stopped doing cardio'). Your posting cadence is Mon/Wed/Fri at 6pm EST. You have a $500/month ad budget. Your audience is 70% women, 25-35, interested in home workouts. Today is Thursday - you're deciding whether to post your scheduled Friday video or wait and test a new hook format.",
  "contextBullets": ["6 months posting history", "Best video: 85k views", "Average: 12k views", "Current video: 3k views (2 days ago)"],
  "constraints": ["$500/month ad budget", "Mon/Wed/Fri 6pm EST posting schedule", "70% women, 25-35, home workouts"],
  "question": "Given your recent 3k-view post and your goal of 100k/month, should you post your scheduled Friday video or test a new hook format first? What specific hook would you test and why?"
}

TONE:
Supportive mentor. Make the user feel progress even if wrong.

SESSION-LEVEL INTELLIGENCE (do not store long-term):
- If signals.repeatedMistakeTopic exists: isolate that topic and generate the next chunk to target it.
- If signals.modeMismatch is true AND current mode is "test": suggest switching to walkthrough (but still produce drills).
- If signals.lastAnswerQuality is "rushed": slow down, ask for reasoning, and prefer coaching prompts.
- Feedback style rule: If an answer is close-but-wrong, explain what was right + what to adjust (never shame).
- Keep output concise and interactive.
Session signals: ${session_signals ? JSON.stringify(session_signals) : "none"}
`.trim();

    const userContent = `
Niche: ${nicheContext.label}
User struggle: ${struggle}
Session objective: ${objective || "Not provided"}
Practice preference selected: ${practice_preference || "Not provided"} (mode: ${mode})

${isScenarioMode ? `
CRITICAL FOR SCENARIO MODE:
- The scenario MUST be tailored to the niche "${nicheContext.label}" AND the user's struggle: "${struggle}"
- The scenario MUST reflect realistic situations related to achieving: "${objective || struggle}"
- Include specific details relevant to this niche and struggle (platforms, metrics, timeframes, constraints)
- Make the decision point directly related to overcoming the user's stated struggle
` : ''}

Generation instructions:
- This is ${isContinuation ? "a continuation chunk" : "the first chunk"}.
- Generate exactly ${generateCount} item(s) for this chunk.
- Cursor: ${cursor ?? "null"}
- Already generated count: ${existing_count}
- Target total: ${drill_plan.targetCount}

Return JSON only.
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
        { status: 500 },
      );
    }

    if (!json || !Array.isArray(json.drills)) {
      return NextResponse.json(
        { error: "AI response missing drills" },
        { status: 500 },
      );
    }

    // Validate scenario drills (if practice_preference is D/walkthrough/scenarios)
    function validateScenarioDrill(drill: any): { valid: boolean; reason?: string } {
      if (!isScenarioMode) return { valid: true };
      
      // Check if it's a scenario drill
      const hasScenario = drill?.kind === "scenario" || drill?.scenario || drill?.prompt;
      if (!hasScenario) return { valid: true }; // Not a scenario drill, skip validation
      
      const scenarioText = drill?.scenario || drill?.prompt || "";
      const question = drill?.question || "";
      
      // Check scenario text exists and is long enough
      if (!scenarioText || scenarioText.trim().length < 200) {
        return { valid: false, reason: "Scenario text missing or too short (< 200 chars)" };
      }
      
      // Check for specific details (numbers, platform names, timeframes, metrics, etc.)
      const hasNumbers = /\d+/.test(scenarioText);
      const hasPlatform = /(platform|app|tool|software|system|TikTok|Instagram|YouTube|Twitter|Facebook|LinkedIn|Shopify|Amazon|eBay|Google|Meta)/i.test(scenarioText);
      const hasTimeframe = /(day|week|month|year|hour|minute|deadline|due|schedule|timeline)/i.test(scenarioText);
      const hasMetric = /(view|click|sale|revenue|conversion|engagement|follower|subscriber|ROI|CPA|CPC|CTR)/i.test(scenarioText);
      const hasAudience = /(audience|user|customer|client|demographic|target|market)/i.test(scenarioText);
      const hasBudget =
        /(budget|cost|price|spend|investment|ad spend)/i.test(scenarioText) ||
        /\$\s?\d+|\d+\s?(usd|dollars|per month|\/mo)/i.test(scenarioText);
      
      const detailCount = [hasNumbers, hasPlatform, hasTimeframe, hasMetric, hasAudience, hasBudget].filter(Boolean).length;
      if (detailCount < 2) {
        return { valid: false, reason: `Scenario lacks specific details (found ${detailCount} of 6 required types)` };
      }
      
      // Check for second person
      if (!/you('re|'ve|'ll| are| have| will|'d| would)/i.test(scenarioText)) {
        return { valid: false, reason: "Scenario not written in second person" };
      }
      
      // Check question is not generic
      const genericPatterns = [
        /^what should you do next/i,
        /^what would you do/i,
        /^explain your reasoning/i,
        /^how would you handle this/i,
        /^what do you think/i,
        /^describe your approach/i,
      ];
      
      const isGeneric = genericPatterns.some(pattern => pattern.test(question));
      if (isGeneric && detailCount < 4) {
        return { valid: false, reason: "Question is too generic and scenario lacks enough context" };
      }
      
      // Check question references scenario details
      const questionRefsScenario = question.length > 0 && (
        scenarioText.toLowerCase().split(/\s+/).some((word: string) => 
          word.length > 4 && question.toLowerCase().includes(word)
        ) || 
        /\d+/.test(question) // Question contains numbers from scenario
      );
      
      if (!questionRefsScenario && question.length > 0) {
        return { valid: false, reason: "Question does not reference scenario specifics" };
      }
      
      return { valid: true };
    }

    // Validate and retry if needed (max 1 retry)
    let validatedDrills = json.drills;
    let retryCount = 0;
    const maxRetries = 1;
    
    for (let i = 0; i < validatedDrills.length; i++) {
      const drill = validatedDrills[i];
      const validation = validateScenarioDrill(drill);
      
      if (!validation.valid && retryCount < maxRetries) {
        console.log(`[generate-drills] Invalid scenario drill detected, retrying... Reason: ${validation.reason}`);
        retryCount++;
        
        // Retry with repair prompt
        const repairPrompt = `
The previous scenario was rejected because: ${validation.reason}

User's niche: ${nicheContext.label}
User's struggle: ${struggle}
Session objective: ${objective}

Generate a NEW scenario drill that:
1. Has a concrete scenario >= 200 characters with at least 2 specific details (numbers, platform, timeframe, metric, audience, budget)
2. Is written in second person
3. Has a question that references specific scenario details (NOT generic like "What should you do next?")
4. Is tailored to the niche and user's struggle

Return the drill in the same format as before.
`.trim();
        
        try {
          const retryCompletion = await openai.chat.completions.create({
            model: "gpt-4.1-mini",
            messages: [
              { role: "system", content: system },
              { role: "user", content: userContent },
              { role: "user", content: repairPrompt },
            ],
            temperature: 0.8,
          });
          
          const retryRaw = retryCompletion.choices[0]?.message?.content ?? "";
          let retryJson: any;
          try {
            retryJson = JSON.parse(retryRaw);
            if (retryJson.drills && retryJson.drills.length > 0) {
              const retryDrill = retryJson.drills[0];
              const retryValidation = validateScenarioDrill(retryDrill);
              if (retryValidation.valid) {
                validatedDrills[i] = retryDrill;
                console.log(`[generate-drills] Retry successful, replaced invalid drill`);
              } else {
                console.error(`[generate-drills] Retry also invalid: ${retryValidation.reason}`);
              }
            }
          } catch (retryErr) {
            console.error("[generate-drills] Failed to parse retry response:", retryErr);
          }
        } catch (retryErr) {
          console.error("[generate-drills] Retry request failed:", retryErr);
        }
      } else if (!validation.valid) {
        console.error(`[generate-drills] Scenario drill failed validation after retry: ${validation.reason}`);
        // Continue with invalid drill but log warning
      }
    }

    // Normalize drills to ensure question field exists for UI compatibility
    function toQuestionText(d: any) {
      if (typeof d?.question === "string" && d.question.trim()) return d.question.trim();

      // Walkthrough/scenario style
      if (typeof d?.scenario === "string" && d.scenario.trim()) {
        const steps = Array.isArray(d.steps)
          ? d.steps
              .map((s: any, i: number) => {
                const p = (s?.prompt ?? "").trim();
                const h = (s?.hint ?? "").trim();
                return p ? `${i + 1}. ${p}${h ? ` (Hint: ${h})` : ""}` : "";
              })
              .filter(Boolean)
              .join("\n")
          : "";

        return `Scenario:\n${d.scenario.trim()}\n\n${steps || "Describe what you would do, step-by-step."}`;
      }

      // Coaching style
      if (typeof d?.prompt === "string" && d.prompt.trim()) return d.prompt.trim();

      // Checklist style
      if (Array.isArray(d?.items) && d.items.length) {
        return `Create a checklist for: ${d?.title ?? "this task"}\n\n- ${d.items.join("\n- ")}`;
      }

      return "Describe your reasoning in detail.";
    }

    function normalizeDrills(drills: any[]) {
      return (drills ?? []).map((d) => {
        // For scenario drills, ensure scenario text is properly formatted
        if (isScenarioMode && (d?.kind === "scenario" || d?.scenario)) {
          // Use scenario field if available, otherwise use prompt
          const scenarioText = d?.scenario || d?.prompt || "";
          let question = d?.question || "";
          
          // If question includes the scenario text, extract just the question part
          if (scenarioText && question.includes(scenarioText)) {
            question = question.replace(scenarioText, "").trim();
          }
          
          // If no question provided, create a default one
          if (!question || question.length < 10) {
            question = "What would you do in this situation and why?";
          }
          
          return {
            ...d,
            scenario: scenarioText,
            question: question,
            contextBullets: d?.contextBullets || [],
            constraints: d?.constraints || [],
          };
        }
        
        return {
          ...d,
          question: toQuestionText(d),
        };
      });
    }

    const safeDrills = normalizeDrills(validatedDrills);

    // ✅ Create DrillSet snapshot if we have nicheKey and session exists
    if (nicheKey) {
      try {
        const session = await prisma.practiceSession.findUnique({
          where: { whopUserId_nicheKey: { whopUserId: userId, nicheKey } },
        });

        if (session) {
          // Extract niche info from nicheKey
          const isCustom = nicheKey.startsWith("CUSTOM:");
          const customNicheValue = isCustom ? nicheKey.replace("CUSTOM:", "") : null;

          await prisma.drillSet.create({
            data: {
              sessionId: session.id,
              struggle: struggle!,
              objective: objective!,
              practicePreference: practice_preference!, // Store as camelCase in DrillSet
              nicheKey: nicheKey,
              customNiche: customNicheValue,
              drillsJson: safeDrills,
            },
          });
        }
      } catch (err) {
        console.error("Failed to create DrillSet snapshot:", err);
        // Continue even if snapshot creation fails
      }
    }

    // Calculate has_more and next_cursor
    const newTotal = existing_count + (json.drills?.length ?? 0);
    const has_more = newTotal < drill_plan.targetCount && drill_plan.stopRule !== "fixed";
    const next_cursor = has_more ? `offset:${newTotal}` : null;

    return NextResponse.json({
      drill_plan: json.drill_plan ?? drill_plan,
      drills: safeDrills,
      has_more,
      next_cursor,
    });
  } catch (error: any) {
    console.error("[generate-drills] Server error:", error);
    return NextResponse.json(
      { 
        error: "INTERNAL", 
        message: error?.message || "Internal server error",
        ...(process.env.NODE_ENV !== "production" && { stack: error?.stack })
      },
      { status: 500 }
    );
  }
}

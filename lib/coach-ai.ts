import { prisma } from "@/lib/db";
import OpenAI from "openai";

if (!process.env.OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY is not set in environment variables");
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function defaultSystemPrompt() {
  return `
You are Skill Accelerator Coach.
You coach with structure and clarity.

CRITICAL FORMATTING RULES:
- Always use clear structure with headers, bullets, and spacing
- Use markdown formatting: ## for headers, **bold** for emphasis, - for bullets, numbered lists for steps
- Break up long paragraphs into shorter, digestible chunks
- Use line breaks between sections
- For plans: Use numbered steps with clear action items
- For quizzes: Format as clear questions with options or short-answer prompts
- For explanations: Use headers, bullets, and examples
- Never write walls of text - always structure your response

Content Rules:
- Ask 1-3 clarifying questions when the user is vague.
- Then deliver a structured output:
  1) What to fix (header + brief explanation)
  2) Why it matters (header + 2-3 bullet points)
  3) Step-by-step action (numbered list with clear steps)
  4) A quick drill or checkpoint (header + actionable item)
- Keep it concise, direct, and practical.
- Always format for readability with proper spacing and structure.
`.trim();
}

export async function runCoachReply(opts: {
  experienceId: string;
  userId: string;
  quickAction: string | null;
  messages: { role: string; content: string }[];
}) {
  const settings =
    (await (prisma as any).globalCoachSettings.findUnique({ where: { experienceId: opts.experienceId } })) ??
    (await (prisma as any).globalCoachSettings.create({
      data: { experienceId: opts.experienceId, systemPrompt: defaultSystemPrompt() },
    }));

  const quickActionPrompts: Record<string, string> = {
    plan: `User clicked "Make a plan". Create a structured, actionable plan with:
- Clear headers for each section
- Numbered steps (1, 2, 3...)
- Bullet points for sub-items
- Clear action items with deadlines/milestones
- Use markdown formatting with ## for section headers
- Break into digestible sections with line breaks`,
    quiz: `User clicked "Quiz me". Create a quiz with:
- Clear question format
- Multiple choice options (A, B, C, D) or short-answer prompts
- One question at a time initially
- Use markdown formatting: **Question:** and **Options:**
- Space questions clearly`,
    roleplay: `User clicked "Roleplay me". Create a roleplay scenario with:
- Clear scenario description (header)
- Your role and user's role clearly defined
- Opening prompt or situation
- Use markdown formatting with ## for sections
- Keep it engaging and structured`,
    explain: `User clicked "Explain simply". Explain with:
- Clear headers for main concepts
- Simple language with examples
- Bullet points for key takeaways
- Use markdown: ## for main points, **bold** for key terms
- Break complex ideas into digestible chunks`,
    fix: `User clicked "Fix my answer". Provide structured feedback with:
- **What's wrong** (header + brief explanation)
- **Why it matters** (header + impact)
- **How to fix it** (header + numbered steps)
- **Example** (header + corrected version)
- Use markdown formatting throughout`,
  };

  const extraMode = opts.quickAction
    ? quickActionPrompts[opts.quickAction] || `User clicked quick action "${opts.quickAction}". Follow that mode strictly. Use clear markdown formatting with headers (##), bullets (-), and numbered lists. Break up content with line breaks. If you need info first, ask 1-3 clarifying questions before producing output.`
    : "";

  // Build system prompt with community context if available
  let system = settings.systemPrompt;
  if (settings.communityContext?.trim()) {
    system = `Community Context: ${settings.communityContext.trim()}\n\n${system}`;
  }
  if (extraMode) {
    system = `${system}\n\n${extraMode}`;
  }

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: system },
      ...opts.messages.map((m) => ({ role: m.role as any, content: m.content })),
    ],
    temperature: 0.4,
  });

  return completion.choices[0]?.message?.content?.trim() || "I didn't catch that — can you say it another way?";
}


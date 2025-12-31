import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { whopsdk } from "@/lib/whop-sdk";
import { prisma } from "@/lib/db";
import { runCoachReply } from "@/lib/coach-ai";

export async function GET(req: Request) {
  try {
    const headerList = await headers();
    const { userId } = await whopsdk.verifyUserToken(headerList);

    const { searchParams } = new URL(req.url);
    const threadId = searchParams.get("threadId");
    if (!threadId) {
      return NextResponse.json({ error: "Missing threadId" }, { status: 400 });
    }

    // Ensure ownership
    const thread = await (prisma as any).coachThread.findFirst({
      where: { id: threadId, userId },
    });
    if (!thread) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const messages = await (prisma as any).coachMessage.findMany({
      where: { threadId },
      orderBy: { createdAt: "asc" },
      take: 200,
      select: {
        id: true,
        role: true,
        content: true,
        createdAt: true,
      },
    });
    
    console.log(`[GET /api/coach/messages] Loaded ${messages.length} messages for thread ${threadId}`);

    // Ensure proper serialization and normalize roles
    const serializedMessages = messages.map((msg: any) => {
      // Normalize role to lowercase "user" or "assistant"
      let normalizedRole = String(msg.role).toLowerCase();
      if (normalizedRole === "human" || normalizedRole === "USER") {
        normalizedRole = "user";
      }
      if (normalizedRole !== "user" && normalizedRole !== "assistant") {
        normalizedRole = "assistant"; // fallback
      }
      
      return {
        id: String(msg.id),
        role: normalizedRole,
        content: String(msg.content),
        createdAt: msg.createdAt instanceof Date ? msg.createdAt.toISOString() : String(msg.createdAt),
      };
    });

    return NextResponse.json({ messages: serializedMessages });
  } catch (error: any) {
    console.error("Error fetching messages:", error);
    return NextResponse.json({ error: error?.message || "Failed to fetch messages" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const headerList = await headers();
    const { userId } = await whopsdk.verifyUserToken(headerList);

    const body = await req.json().catch(() => null);

    const { experienceId, threadId, content, quickAction, isSystemMessage } = body || {};
    if (!experienceId || !threadId || !content) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Ensure ownership
    const thread = await (prisma as any).coachThread.findFirst({
      where: { id: threadId, experienceId, userId },
    });
    if (!thread) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Save message (user or system-generated context message)
    const messageRole = isSystemMessage ? "assistant" : "user";
    try {
      const savedMessage = await (prisma as any).coachMessage.create({
        data: { threadId, role: messageRole, content: String(content) },
      });
      
      console.log(`[POST /api/coach/messages] ✅ Saved ${messageRole} message for thread ${threadId}`, {
        messageId: savedMessage.id,
        contentLength: String(content).length,
        threadId,
      });
    } catch (saveError: any) {
      console.error(`[POST /api/coach/messages] ❌ Failed to save ${messageRole} message:`, saveError);
      throw new Error(`Failed to save message: ${saveError?.message || "Unknown error"}`);
    }

    // If this is a system message (auto-generated context), don't generate a response
    if (!isSystemMessage) {
      // Get full history including the new user message
      const history = await (prisma as any).coachMessage.findMany({
        where: { threadId },
        orderBy: { createdAt: "asc" },
        take: 30,
      });

      // Generate AI response
      const assistantText = await runCoachReply({
        experienceId,
        userId,
        quickAction: quickAction ?? null,
        messages: history.map((m: any) => ({ role: m.role, content: m.content })),
      });

      // Save assistant message
      try {
        const assistantMessage = await (prisma as any).coachMessage.create({
          data: { threadId, role: "assistant", content: assistantText },
        });
        
        console.log(`[POST /api/coach/messages] ✅ Saved assistant message for thread ${threadId}`, {
          messageId: assistantMessage.id,
          contentLength: assistantText.length,
        });
      } catch (saveError: any) {
        console.error(`[POST /api/coach/messages] ❌ Failed to save assistant message:`, saveError);
        // Don't throw - we still want to return the user message even if assistant save fails
      }
    }

    // Touch updatedAt to refresh thread ordering
    await (prisma as any).coachThread.update({ 
      where: { id: threadId }, 
      data: { updatedAt: new Date() } 
    });

    // Return all messages including both user and assistant
    // This query should include the user message we just saved and the assistant message
    const messages = await (prisma as any).coachMessage.findMany({
      where: { threadId },
      orderBy: { createdAt: "asc" },
      take: 200,
      select: {
        id: true,
        role: true,
        content: true,
        createdAt: true,
      },
    });
    
    console.log(`[POST /api/coach/messages] Query result for thread ${threadId}:`, {
      totalMessages: messages.length,
      userMessages: messages.filter((m: any) => m.role === "user" || m.role === "USER").length,
      assistantMessages: messages.filter((m: any) => m.role === "assistant").length,
      messageIds: messages.map((m: any) => ({ id: m.id, role: m.role })),
    });

    // Ensure proper serialization and normalize roles
    const serializedMessages = messages.map((msg: any) => {
      // Normalize role - ensure "user" is lowercase
      let normalizedRole = String(msg.role || "").trim().toLowerCase();
      if (normalizedRole === "human") {
        normalizedRole = "user";
      }
      // Ensure we only have "user" or "assistant"
      if (normalizedRole !== "user" && normalizedRole !== "assistant") {
        normalizedRole = "assistant"; // fallback
      }
      
      return {
        id: String(msg.id),
        role: normalizedRole,
        content: String(msg.content || ""),
        createdAt: msg.createdAt instanceof Date ? msg.createdAt.toISOString() : String(msg.createdAt || new Date().toISOString()),
      };
    });

    // Verify we have both user and assistant messages
    const hasUser = serializedMessages.some((m: any) => m.role === "user");
    const hasAssistant = serializedMessages.some((m: any) => m.role === "assistant");
    
    if (!hasUser && serializedMessages.length > 0) {
      console.error(`[POST /api/coach/messages] WARNING: No user messages in response for thread ${threadId}`);
    }

    return NextResponse.json({ messages: serializedMessages });
  } catch (error: any) {
    console.error("Error sending message:", error);
    return NextResponse.json({ error: error?.message || "Failed to send message" }, { status: 500 });
  }
}


import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { whopsdk } from "@/lib/whop-sdk";
import { prisma } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const headerList = await headers();
    let userId: string;
    try {
      const authResult = await whopsdk.verifyUserToken(headerList);
      userId = authResult.userId;
    } catch (authError: any) {
      console.error("[GET /api/coach/threads] Auth error:", authError);
      return NextResponse.json({ 
        error: "Authentication failed",
        details: process.env.NODE_ENV === "development" ? String(authError) : undefined,
      }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const experienceId = searchParams.get("experienceId");
    if (!experienceId) {
      return NextResponse.json({ error: "Missing experienceId" }, { status: 400 });
    }

    console.log(`[GET /api/coach/threads] Querying threads for userId: ${userId}, experienceId: ${experienceId}`);

    let threads;
    try {
      // Try with favorite field first
      threads = await (prisma as any).coachThread.findMany({
        where: { experienceId, userId },
        orderBy: [
          { favorite: "desc" }, // Favorites first
          { updatedAt: "desc" }, // Then by most recent
        ],
        take: 30,
        select: {
          id: true,
          title: true,
          favorite: true,
          updatedAt: true,
          createdAt: true,
        },
      });
      console.log(`[GET /api/coach/threads] Query returned ${threads.length} threads`);
    } catch (dbError: any) {
      const errorMessage = String(dbError?.message || dbError || 'Unknown error');
      
      // If favorite field doesn't exist, try without it
      if (errorMessage.includes('favorite') || errorMessage.includes('Unknown argument')) {
        console.warn(`[GET /api/coach/threads] favorite field not available, querying without it`);
        try {
          threads = await (prisma as any).coachThread.findMany({
            where: { experienceId, userId },
            orderBy: { updatedAt: "desc" },
            take: 30,
            select: {
              id: true,
              title: true,
              updatedAt: true,
              createdAt: true,
            },
          });
          // Add default favorite: false for threads without the field
          threads = threads.map((t: any) => ({ ...t, favorite: false }));
          console.log(`[GET /api/coach/threads] Query returned ${threads.length} threads (without favorite)`);
        } catch (retryError: any) {
          const retryErrorMessage = String(retryError?.message || retryError || '');
          // If table doesn't exist, return empty array
          if (retryError?.code === 'P2001' || retryErrorMessage.toLowerCase().includes('does not exist')) {
            console.warn(`[GET /api/coach/threads] Table doesn't exist yet, returning empty array`);
            threads = [];
          } else {
            throw retryError; // Re-throw if it's a different error
          }
        }
      } else {
        // If table doesn't exist, return empty array instead of error
        const errorCode = dbError?.code || '';
        const isTableMissing = 
          errorCode === 'P2001' || 
          errorMessage.toLowerCase().includes('does not exist') ||
          (errorMessage.toLowerCase().includes('relation') && errorMessage.toLowerCase().includes('does not exist'));
        
        if (isTableMissing) {
          console.warn(`[GET /api/coach/threads] Table doesn't exist yet, returning empty array`);
          threads = [];
        } else {
          throw dbError; // Re-throw to be caught by outer catch
        }
      }
    }

    // Ensure proper serialization of dates
    const serializedThreads = threads.map((t: any) => ({
      id: String(t.id),
      title: t.title || null,
      favorite: Boolean(t.favorite),
      updatedAt: t.updatedAt instanceof Date ? t.updatedAt.toISOString() : String(t.updatedAt),
      createdAt: t.createdAt instanceof Date ? t.createdAt.toISOString() : String(t.createdAt),
    }));
    
    console.log(`[GET /api/coach/threads] Found ${serializedThreads.length} threads for user ${userId} in experience ${experienceId}`, {
      threadIds: serializedThreads.map((t: any) => t.id),
      threadTitles: serializedThreads.map((t: any) => t.title),
    });
    
    return NextResponse.json({ threads: serializedThreads });
  } catch (error: any) {
    const errorMessage = String(error?.message || error || 'Unknown error');
    const errorCode = error?.code || '';
    
    console.error("[GET /api/coach/threads] Error fetching threads:", error);
    console.error("[GET /api/coach/threads] Error stack:", error?.stack);
    console.error("[GET /api/coach/threads] Error details:", {
      message: errorMessage,
      name: error?.name,
      code: errorCode,
      fullError: String(error),
    });
    
    // If it's a table missing error, return empty array instead of 500
    const isTableMissing = 
      errorCode === 'P2001' || 
      errorMessage.toLowerCase().includes('does not exist') ||
      (errorMessage.toLowerCase().includes('relation') && errorMessage.toLowerCase().includes('does not exist')) ||
      (errorMessage.toLowerCase().includes('table') && errorMessage.toLowerCase().includes('does not exist'));
    
    if (isTableMissing) {
      console.warn("[GET /api/coach/threads] Table doesn't exist, returning empty threads array");
      return NextResponse.json({ threads: [] });
    }
    
    return NextResponse.json({ 
      error: errorMessage,
      details: process.env.NODE_ENV === "development" ? String(error) : undefined,
    }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const headerList = await headers();
    const { userId } = await whopsdk.verifyUserToken(headerList);

    const body = await req.json().catch(() => null);
    const experienceId = body?.experienceId;
    if (!experienceId) {
      return NextResponse.json({ error: "Missing experienceId" }, { status: 400 });
    }

    const thread = await (prisma as any).coachThread.create({
      data: { experienceId, userId, title: "Coach Chat" },
    });
    
    // Ensure proper serialization
    const serializedThread = {
      id: String(thread.id),
      title: thread.title || null,
      favorite: Boolean(thread.favorite || false),
      updatedAt: thread.updatedAt instanceof Date ? thread.updatedAt.toISOString() : String(thread.updatedAt),
      createdAt: thread.createdAt instanceof Date ? thread.createdAt.toISOString() : String(thread.createdAt),
    };
    
    console.log(`[POST /api/coach/threads] ✅ Created thread for user ${userId} in experience ${experienceId}`, {
      threadId: serializedThread.id,
      title: serializedThread.title,
    });

    return NextResponse.json({ thread: serializedThread });
  } catch (error: any) {
    console.error("Error creating thread:", error);
    return NextResponse.json({ error: error?.message || "Failed to create thread" }, { status: 500 });
  }
}


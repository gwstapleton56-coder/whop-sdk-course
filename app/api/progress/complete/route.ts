import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { whopsdk } from "@/lib/whop-sdk";
import { prisma } from "@/lib/db";
import { Niche } from "@prisma/client";

type Body = {
  niche: Niche;
  customNiche?: string | null;
  clientCompletionId: string;
};

export async function POST(req: Request) {
  try {
    console.log("📥 progress/complete API called");
    
    let userId: string;
    try {
      const authResult = await whopsdk.verifyUserToken(await headers());
      userId = authResult.userId;
      console.log("📥 User authenticated:", userId);
    } catch (authErr: any) {
      console.error("❌ Auth failed:", authErr);
      return NextResponse.json(
        { ok: false, error: "Authentication failed", details: authErr?.message },
        { status: 401 }
      );
    }

    let body: Body;
    try {
      body = (await req.json()) as Body;
      console.log("📥 Request body:", body);
    } catch (parseErr: any) {
      console.error("❌ Failed to parse request body:", parseErr);
      return NextResponse.json(
        { ok: false, error: "Invalid request body", details: parseErr?.message },
        { status: 400 }
      );
    }

    if (!body?.clientCompletionId) {
      console.warn("❌ Missing clientCompletionId");
      return NextResponse.json({ error: "Missing clientCompletionId" }, { status: 400 });
    }

    if (!body?.niche) {
      console.warn("❌ Missing niche");
      return NextResponse.json({ error: "Missing niche" }, { status: 400 });
    }

    console.log("📥 Validating niche:", { niche: body.niche, isValid: ["TRADING", "SPORTS", "SOCIAL_MEDIA", "RESELLING", "FITNESS", "CUSTOM"].includes(body.niche) });

    // If CUSTOM, require customNiche
    if (body.niche === "CUSTOM") {
      const cn = (body.customNiche ?? "").trim();
      if (!cn) {
        return NextResponse.json(
          { error: "customNiche required when niche=CUSTOM" },
          { status: 400 }
        );
      }
    }

    // ✅ Idempotent write (retries won't double count)
    // Check if progressEvent model exists
    if (!prisma.progressEvent) {
      console.error("❌ prisma.progressEvent is undefined - Prisma client may need regeneration");
      console.error("❌ Available Prisma models:", Object.keys(prisma).filter(k => !k.startsWith('$') && !k.startsWith('_')));
      return NextResponse.json(
        { ok: false, error: "Database model not available. Please restart the server." },
        { status: 500 }
      );
    }
    
    console.log("📥 Creating/updating ProgressEvent with data:", {
      whopUserId: userId,
      niche: body.niche,
      customNiche: body.niche === "CUSTOM" ? (body.customNiche ?? "").trim() : null,
      clientCompletionId: body.clientCompletionId,
    });
    
    try {
      // @ts-ignore - Prisma types may not be fully updated yet
      const existing = await (prisma as any).progressEvent.findFirst({
        where: { clientCompletionId: body.clientCompletionId },
        select: { id: true },
      });

      if (!existing) {
        // @ts-ignore
        await (prisma as any).progressEvent.create({
          data: {
            whopUserId: userId,
            niche: body.niche,
            customNiche: body.niche === "CUSTOM" ? (body.customNiche ?? "").trim() : null,
            clientCompletionId: body.clientCompletionId,
          },
        });
      }
      console.log("✅ ProgressEvent created successfully");
    } catch (dbErr: any) {
      console.error("❌ Prisma create failed:", dbErr);
      console.error("❌ Prisma error details:", {
        message: dbErr?.message,
        code: dbErr?.code,
        meta: dbErr?.meta,
        name: dbErr?.name,
      });
      throw dbErr; // Re-throw to be caught by outer catch
    }

    // ✅ Return fresh count so UI can show correct number immediately
    const where = {
      whopUserId: userId,
      niche: body.niche,
      ...(body.niche === "CUSTOM"
        ? { customNiche: (body.customNiche ?? "").trim() }
        : { customNiche: null }),
    };
    console.log("📥 Counting with where:", where);
    // @ts-ignore - Prisma types may not be fully updated yet
    const totalCompletedInNiche = await prisma.progressEvent.count({ where });
    console.log("✅ Total completed in niche:", totalCompletedInNiche);

    console.log("📤 Returning success response:", { ok: true, niche: body.niche, totalCompletedInNiche });
    return NextResponse.json({ 
      ok: true, 
      niche: body.niche,
      totalCompletedInNiche 
    }, { status: 200 });
  } catch (err: any) {
    console.error("❌ progress/complete route error:", err);
    console.error("❌ Error details:", {
      message: err?.message,
      code: err?.code,
      meta: err?.meta,
      name: err?.name,
      stack: err?.stack,
    });
    
    // Ensure we always return a valid JSON response
    const errorResponse = {
      ok: false,
      error: err?.message || String(err) || "Failed to complete progress update",
      details: err?.meta || null,
      code: err?.code || null,
    };
    
    console.error("📤 Returning error response:", errorResponse);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}

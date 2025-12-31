import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { whopsdk } from "@/lib/whop-sdk";
import { prisma } from "@/lib/db";

// DELETE thread
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ threadId: string }> | { threadId: string } }
) {
  try {
    const headerList = await headers();
    const { userId } = await whopsdk.verifyUserToken(headerList);

    const resolvedParams = await Promise.resolve(params);
    const { threadId } = resolvedParams;

    // Ensure ownership
    const thread = await (prisma as any).coachThread.findFirst({
      where: { id: threadId, userId },
    });

    if (!thread) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Delete thread (messages will be cascade deleted)
    await (prisma as any).coachThread.delete({
      where: { id: threadId },
    });

    console.log(`[DELETE /api/coach/threads/${threadId}] Successfully deleted thread`);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting thread:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to delete thread" },
      { status: 500 }
    );
  }
}

// PATCH thread (rename, favorite)
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ threadId: string }> | { threadId: string } }
) {
  try {
    const headerList = await headers();
    const { userId } = await whopsdk.verifyUserToken(headerList);

    const resolvedParams = await Promise.resolve(params);
    const { threadId } = resolvedParams;
    const body = await req.json().catch(() => null);

    const { title, favorite } = body || {};

    // Ensure ownership
    const thread = await (prisma as any).coachThread.findFirst({
      where: { id: threadId, userId },
    });

    if (!thread) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Update thread
    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (favorite !== undefined) updateData.favorite = Boolean(favorite);

    const updated = await (prisma as any).coachThread.update({
      where: { id: threadId },
      data: updateData,
    });

    return NextResponse.json({ thread: updated });
  } catch (error: any) {
    console.error("Error updating thread:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to update thread" },
      { status: 500 }
    );
  }
}


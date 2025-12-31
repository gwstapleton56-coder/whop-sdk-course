import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { whopsdk } from "@/lib/whop-sdk";
import { prisma } from "@/lib/db";
import { isOwner } from "@/lib/access";
import { unlink } from "fs/promises";
import { join } from "path";

// DELETE /api/knowledge-resources/[id]
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const headerList = await headers();
    const { userId } = await whopsdk.verifyUserToken(headerList);

    const { id } = await params;

    // Find the resource first using raw SQL
    const findResult = await (prisma as any).$queryRawUnsafe(
      `SELECT * FROM "knowledge_resource" WHERE "id" = $1`,
      id
    );

    const resource = Array.isArray(findResult) && findResult[0] ? findResult[0] : null;

    if (!resource) {
      return NextResponse.json({ error: "Resource not found" }, { status: 404 });
    }

    // Check if user is owner of the experience
    const access = await whopsdk.users.checkAccess(resource.experienceId, { id: userId });
    if (!isOwner(access)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Delete the file from disk if it's a local file (starts with /uploads/)
    if (resource.url.startsWith("/uploads/")) {
      try {
        const filePath = join(process.cwd(), "public", resource.url);
        await unlink(filePath);
      } catch (fileError: any) {
        // File might not exist, that's okay - log but don't fail
        console.warn("Failed to delete file:", fileError?.message);
      }
    }

    // Delete from database using raw SQL
    await (prisma as any).$executeRawUnsafe(
      `DELETE FROM "knowledge_resource" WHERE "id" = $1`,
      id
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting knowledge resource:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to delete resource" },
      { status: 500 }
    );
  }
}


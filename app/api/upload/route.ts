import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import { whopsdk } from "@/lib/whop-sdk";
import { isOwner } from "@/lib/access";

/**
 * File upload handler
 * 
 * NOTE: This currently saves files to local filesystem (public/uploads).
 * In production/serverless environments, you should:
 * 1. Upload files to object storage (S3, R2, Supabase Storage, etc.)
 * 2. Get back a permanent URL
 * 3. Store only the URL in the database (via KnowledgeResource table)
 * 
 * This implementation is temporary and works for development/testing.
 */
export async function POST(req: Request) {
  try {
    const headerList = await headers();
    const { userId } = await whopsdk.verifyUserToken(headerList);

    const formData = await req.formData();
    const file = formData.get("file") as File;
    const experienceId = formData.get("experienceId") as string;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!experienceId) {
      return NextResponse.json({ error: "No experienceId provided" }, { status: 400 });
    }

    // Check if user is owner (only owners can upload files)
    const access = await whopsdk.users.checkAccess(experienceId, { id: userId });
    if (!isOwner(access)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // TODO: Replace this with object storage (S3/R2/Supabase Storage)
    // For now, save to local filesystem
    // Create uploads directory if it doesn't exist
    const uploadsDir = join(process.cwd(), "public", "uploads", experienceId);
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }

    // Generate a unique filename
    const timestamp = Date.now();
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const fileName = `${timestamp}_${sanitizedFileName}`;
    const filePath = join(uploadsDir, fileName);

    // Write file to disk
    await writeFile(filePath, buffer);

    // Return the public URL
    // In production, this would be a URL from object storage
    const publicUrl = `/uploads/${experienceId}/${fileName}`;

    return NextResponse.json({ url: publicUrl, fileName: file.name });
  } catch (error: any) {
    console.error("Error uploading file:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to upload file" },
      { status: 500 }
    );
  }
}


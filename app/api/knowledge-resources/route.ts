import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { whopsdk } from "@/lib/whop-sdk";
import { prisma } from "@/lib/db";
import { isOwner } from "@/lib/access";
import { z } from "zod";

const resourceSchema = z.object({
  experienceId: z.string(),
  scope: z.enum(["practice", "coach"]),
  type: z.enum(["pdf", "link", "doc", "video"]),
  title: z.string().min(1),
  url: z.string().min(1), // Accept any string (URL or local path like /uploads/...)
  description: z.string().optional().nullable(),
  nicheKey: z.string().optional().nullable(),
});

// GET /api/knowledge-resources?experienceId=xxx&scope=practice|coach
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const experienceId = searchParams.get("experienceId");
    const scope = searchParams.get("scope"); // "practice" or "coach"

    if (!experienceId) {
      return NextResponse.json({ error: "Missing experienceId" }, { status: 400 });
    }

    // Use raw SQL query as fallback (table exists but Prisma client may need regeneration)
    let query = `SELECT * FROM "knowledge_resource" WHERE "experienceId" = $1`;
    const params: any[] = [experienceId];
    
    if (scope && (scope === "practice" || scope === "coach")) {
      query += ` AND "scope" = $2`;
      params.push(scope);
    }
    
    query += ` ORDER BY "createdAt" DESC`;

    const result = await (prisma as any).$queryRawUnsafe(query, ...params);
    
    // Convert result to proper format
    const resources = Array.isArray(result) ? result.map((r: any) => ({
      id: r.id,
      experienceId: r.experienceId,
      scope: r.scope,
      type: r.type,
      title: r.title,
      url: r.url,
      description: r.description,
      nicheKey: r.nicheKey,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    })) : [];

    return NextResponse.json({ resources });
  } catch (error: any) {
    console.error("Error fetching knowledge resources:", error);
    // If table doesn't exist, return empty array instead of error
    if (error?.message?.includes("does not exist") || error?.code === "42P01") {
      return NextResponse.json({ resources: [] });
    }
    return NextResponse.json(
      { error: error?.message || "Failed to fetch resources" },
      { status: 500 }
    );
  }
}

// POST /api/knowledge-resources
export async function POST(req: Request) {
  try {
    const headerList = await headers();
    const { userId } = await whopsdk.verifyUserToken(headerList);

    const body = await req.json();
    console.log("[POST /api/knowledge-resources] Request body:", JSON.stringify(body, null, 2));
    
    const validationResult = resourceSchema.safeParse(body);
    if (!validationResult.success) {
      console.error("[POST /api/knowledge-resources] Validation errors:", validationResult.error.errors);
      return NextResponse.json({ 
        error: "Invalid request data", 
        details: validationResult.error.errors 
      }, { status: 400 });
    }
    const validated = validationResult.data;

    // Check if user is owner
    const access = await whopsdk.users.checkAccess(validated.experienceId, { id: userId });
    if (!isOwner(access)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Create resource using raw SQL (table exists but Prisma client may need regeneration)
    // Generate a unique ID (similar to CUID format)
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 11);
    const id = `cl${timestamp}${random}`;
    const insertQuery = `
      INSERT INTO "knowledge_resource" (
        "id", "experienceId", "scope", "type", "title", "url", "description", "nicheKey", "createdAt", "updatedAt"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
      RETURNING *
    `;
    
    const result = await (prisma as any).$queryRawUnsafe(
      insertQuery,
      id,
      validated.experienceId,
      validated.scope,
      validated.type,
      validated.title,
      validated.url,
      validated.description || null,
      validated.nicheKey || null
    );

    const resource = Array.isArray(result) && result[0] ? {
      id: result[0].id,
      experienceId: result[0].experienceId,
      scope: result[0].scope,
      type: result[0].type,
      title: result[0].title,
      url: result[0].url,
      description: result[0].description,
      nicheKey: result[0].nicheKey,
      createdAt: result[0].createdAt,
      updatedAt: result[0].updatedAt,
    } : null;

    if (!resource) {
      throw new Error("Failed to create resource");
    }

    return NextResponse.json({ resource }, { status: 201 });
  } catch (error: any) {
    if (error.name === "ZodError") {
      return NextResponse.json({ error: "Invalid request data", details: error.errors }, { status: 400 });
    }
    console.error("Error creating knowledge resource:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to create resource" },
      { status: 500 }
    );
  }
}


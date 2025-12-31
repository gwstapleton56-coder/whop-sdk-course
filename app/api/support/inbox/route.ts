import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { whopsdk } from "@/lib/whop-sdk";
import { prisma } from "@/lib/db";
import { isOwnerUserId } from "@/lib/is-owner";

export const runtime = "nodejs"; // IMPORTANT (Prisma needs node runtime)

export async function GET() {
  try {
    const headerList = await headers();
    const { userId } = await whopsdk.verifyUserToken(headerList);

    if (!isOwnerUserId(userId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const tickets = await prisma.supportTicket.findMany({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(tickets);
  } catch (error: any) {
    console.error("[support/inbox] Error fetching tickets:", error);
    return NextResponse.json(
      { error: "Failed to fetch tickets" },
      { status: 500 }
    );
  }
}


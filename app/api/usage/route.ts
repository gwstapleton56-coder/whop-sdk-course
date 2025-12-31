import { headers } from "next/headers";
import { whopsdk } from "@/lib/whop-sdk";
import { prisma } from "@/lib/db";

function startOfTodayUTC() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
}

export async function GET() {
  const headerList = await headers();
  const { userId } = await whopsdk.verifyUserToken(headerList);

  // TEMP until billing wired:
  // TODO: Check actual Pro status from Whop
  const plan: "free" | "pro" = "free" as "free" | "pro";

  if (plan === "pro") {
    return Response.json({ plan, limit: null, used: 0, remaining: Infinity, capped: false });
  }

  const limit = 2;

  const used = await prisma.progressEvent.count({
    where: {
      whopUserId: userId,
      createdAt: { gte: startOfTodayUTC() },
    },
  });

  const remaining = Math.max(0, limit - used);

  return Response.json({
    plan,
    limit,
    used,
    remaining,
    capped: remaining === 0,
  });
}


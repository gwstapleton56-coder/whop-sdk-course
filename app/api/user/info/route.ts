import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { whopsdk } from "@/lib/whop-sdk";
import { isOwner } from "@/lib/access";
import { normalizeWhopAvatarUrl } from "@/lib/avatar";

export async function GET(req: Request) {
  try {
    const headerList = await headers();
    const { userId } = await whopsdk.verifyUserToken(headerList);

    const { searchParams } = new URL(req.url);
    const experienceId = searchParams.get("experienceId");

    const user = await whopsdk.users.retrieve(userId);
    const displayName = user.name || `@${user.username}`;
    const u: any = user;
    const avatarUrl = normalizeWhopAvatarUrl(
      u?.profile_picture?.original_url ??
        u?.profile_picture?.url ??
        null
    );

    // Check if user is owner of the experience (if experienceId provided)
    let isOwnerUser = false;
    if (experienceId) {
      try {
        const access = await whopsdk.users.checkAccess(experienceId, { id: userId });
        isOwnerUser = isOwner(access);
      } catch (e) {
        // Ignore errors checking owner status
      }
    }

    return NextResponse.json({
      displayName,
      username: user.username,
      avatarUrl,
      isOwner: isOwnerUser,
    });
  } catch (error: any) {
    console.error("Error fetching user info:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch user info" },
      { status: 500 }
    );
  }
}


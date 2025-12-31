import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { whopsdk } from "@/lib/whop-sdk";
import { PRO_PRODUCT_ID } from "@/lib/config";
import { isOwner } from "@/lib/access";

export async function GET(req: Request) {
  try {
    const headerList = await headers();
    const { userId } = await whopsdk.verifyUserToken(headerList);

    // Get experienceId from query params if available
    const { searchParams } = new URL(req.url);
    const experienceId = searchParams.get("experienceId");

    // If experienceId is provided, check if user is owner of that experience
    // Owners automatically get Pro access
    if (experienceId) {
      try {
        const experienceAccess = await whopsdk.users.checkAccess(experienceId, { id: userId });
        if (isOwner(experienceAccess)) {
          console.log("User is owner of experience, granting Pro access automatically");
          return NextResponse.json({ isPro: true, reason: "owner" }, { status: 200 });
        }
      } catch (e: any) {
        console.warn("Failed to check experience access for owner check:", e?.message);
        // Continue to normal Pro check
      }
    }

    console.log("Checking Pro status for user:", userId, "against product:", PRO_PRODUCT_ID);

    // Check if user has access to the Pro product
    try {
      const access = await whopsdk.users.checkAccess(PRO_PRODUCT_ID, { id: userId });
      const isPro = access?.has_access === true;

      console.log("Pro access check result:", { isPro, accessLevel: access?.access_level });

      return NextResponse.json({ isPro }, { status: 200 });
    } catch (e: any) {
      console.error("Failed to check Pro access:", e?.message || e);
      return NextResponse.json({ isPro: false, error: e?.message }, { status: 200 });
    }
  } catch (error: any) {
    console.error("Pro status check failed:", error?.message || error);
    return NextResponse.json({ isPro: false, error: error?.message }, { status: 200 });
  }
}


import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { whopsdk } from "@/lib/whop-sdk";
import { prisma } from "@/lib/db";
import { isCreatorOrAdmin } from "@/lib/access";
import { seedWhopDefaultsIfAllowed } from "@/lib/niche-defaults";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ experienceId: string }> }
) {
  const { experienceId } = await params;

  const headerList = await headers();
  const { userId } = await whopsdk.verifyUserToken(headerList);
  const access = await whopsdk.users.checkAccess(experienceId, { id: userId });

  if (!isCreatorOrAdmin(access)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await (prisma as any).creatorSettings.upsert({
    where: { experienceId },
    update: { allowAutoDefaults: true },
    create: { experienceId, allowAutoDefaults: true },
  });

  // if they wiped everything, this will seed again
  await seedWhopDefaultsIfAllowed(experienceId);

  // Revalidate the home page to show restored presets
  revalidatePath(`/experiences/${experienceId}/home`);

  return NextResponse.json({ ok: true });
}



import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { whopsdk } from "@/lib/whop-sdk";
import { isOwnerUserId } from "@/lib/is-owner";
import { prisma } from "@/lib/db";
import { CreatorAdminCoachClient } from "./_components/creator-admin-coach-client";

export default async function CreatorAdminCoachPage({
  params,
}: {
  params: Promise<{ experienceId: string }>;
}) {
  const { experienceId } = await params;

  const headerList = await headers();
  const { userId } = await whopsdk.verifyUserToken(headerList);

  if (!isOwnerUserId(userId)) {
    redirect(`/experiences/${experienceId}`);
  }

  // Load current coach settings
  const settings = await (prisma as any).globalCoachSettings.findUnique({
    where: { experienceId },
  });

  // Transform settings to include resources
  const transformedSettings = settings
    ? {
        ...settings,
        resources: (settings.resources as any) || [],
      }
    : null;

  return <CreatorAdminCoachClient experienceId={experienceId} initialSettings={transformedSettings} />;
}


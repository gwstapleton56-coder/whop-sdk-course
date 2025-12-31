import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { whopsdk } from "@/lib/whop-sdk";
import { prisma } from "@/lib/db";
import { isOwner } from "@/lib/access";
import { CreatorAdminClient } from "./_components/creator-admin-client";

export default async function CreatorAdminPage({
  params,
}: {
  params: Promise<{ experienceId: string }>;
}) {
  const { experienceId } = await params;

  // Log experienceId to check for mismatches
  console.log("[ADMIN] experienceId:", experienceId);

  const headerList = await headers();
  const { userId } = await whopsdk.verifyUserToken(headerList);

  const access = await whopsdk.users.checkAccess(experienceId, { id: userId });

  // Only owners (or admins who installed the app) can access admin panel
  if (!isOwner(access)) {
    redirect(`/experiences/${experienceId}/home`);
  }

  // Load current creator settings, presets, and coach settings
  const [settings, presets, coachSettings] = await Promise.all([
    (prisma as any).creatorSettings.findUnique({
      where: { experienceId },
    }).catch(() => null),
    (prisma as any).nichePreset.findMany({
      where: { experienceId },
      orderBy: { sortOrder: "asc" },
      // Select only fields that exist (icon field may not exist until migration is applied)
      select: {
        id: true,
        experienceId: true,
        key: true,
        label: true,
        aiContext: true,
        enabled: true,
        sortOrder: true,
        createdAt: true,
        updatedAt: true,
        // icon: true, // Will be available after migration
      },
    }).catch(() => []),
    (prisma as any).globalCoachSettings.findUnique({
      where: { experienceId },
    }).catch(() => null),
  ]);

  // Try to get resources using raw SQL (works even if column doesn't exist in Prisma schema)
  let resources: any[] = [];
  if (settings) {
    try {
      let result;
      try {
        result = await (prisma as any).$queryRawUnsafe(
          `SELECT "resources" FROM "creator_settings" WHERE "experienceId" = $1`,
          experienceId
        );
      } catch (e1: any) {
        result = await (prisma as any).$queryRawUnsafe(
          `SELECT "resources" FROM "creator_settings" WHERE experience_id = $1`,
          experienceId
        );
      }
      if (result && result[0] && result[0].resources) {
        resources = Array.isArray(result[0].resources) ? result[0].resources : [];
      }
    } catch (e: any) {
      // Column doesn't exist or query failed, use empty array
      resources = [];
    }
  }

  // Transform Prisma result to match client component type
  const transformedSettings = settings
    ? {
        experienceId: settings.experienceId,
        globalContext: settings.globalContext ?? "",
        resources,
        updatedAt: settings.updatedAt?.toISOString(),
      }
    : null;

  // Transform coach settings
  let transformedCoachSettings = null;
  if (coachSettings) {
    // Try to get coach resources using raw SQL
    let coachResources: any[] = [];
    try {
      let result;
      try {
        result = await (prisma as any).$queryRawUnsafe(
          `SELECT "resources" FROM "global_coach_settings" WHERE "experienceId" = $1`,
          experienceId
        );
      } catch (e1: any) {
        result = await (prisma as any).$queryRawUnsafe(
          `SELECT "resources" FROM "global_coach_settings" WHERE experience_id = $1`,
          experienceId
        );
      }
      if (result && result[0] && result[0].resources) {
        coachResources = Array.isArray(result[0].resources) ? result[0].resources : [];
      }
    } catch (e: any) {
      coachResources = [];
    }

    transformedCoachSettings = {
      ...coachSettings,
      resources: coachResources,
    };
  }

  return (
    <CreatorAdminClient
      experienceId={experienceId}
      initialSettings={transformedSettings}
      initialPresets={presets}
      initialCoachSettings={transformedCoachSettings}
      isOwner={true}
    />
  );
}

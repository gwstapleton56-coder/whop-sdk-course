import { headers } from "next/headers";
import { whopsdk } from "@/lib/whop-sdk";
import { prisma } from "@/lib/db";
import { isCreatorOrAdmin, isOwner } from "@/lib/access";
import { seedWhopDefaultsIfAllowed } from "@/lib/niche-defaults";
import { AppShell } from "./_components/app-shell";
import { normalizeWhopAvatarUrl } from "@/lib/avatar";

export default async function ExperienceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ experienceId: string }>;
}) {
  const { experienceId } = await params;

  const headerList = await headers();
  const { userId } = await whopsdk.verifyUserToken(headerList);

  // Seed defaults
  await seedWhopDefaultsIfAllowed(experienceId);

  const [user, access, presets, coachSettings] = await Promise.all([
    whopsdk.users.retrieve(userId),
    whopsdk.users.checkAccess(experienceId, { id: userId }),
    (prisma as any).nichePreset
      .findMany({
        where: { experienceId },
        orderBy: { sortOrder: "asc" },
        select: { key: true, label: true, enabled: true, icon: true, sortOrder: true },
      })
      .catch(() => []),
    (prisma as any).globalCoachSettings
      .findUnique({
        where: { experienceId },
        select: { coachName: true },
      })
      .catch(() => null),
  ]);

  const displayName = user.name || `@${user.username}`;
  const u: any = user;
  
  // Prefer the original profile picture URL when available, normalize default avatar URLs
  const avatarUrl = normalizeWhopAvatarUrl(
    u?.profile_picture?.original_url ??
      u?.profile_picture?.url ??
      null
  );

  const isCreator = isCreatorOrAdmin(access);
  const isOwnerUser = isOwner(access);

  // Get coach name, fallback to "AI Coach" if not set
  const coachName = coachSettings?.coachName || "AI Coach";

  return (
    <AppShell
      experienceId={experienceId}
      displayName={displayName}
      username={user.username}
      avatarUrl={avatarUrl}
      presets={presets}
      isCreator={isCreator}
      isOwner={isOwnerUser}
      coachName={coachName}
    >
      {children}
    </AppShell>
  );
}


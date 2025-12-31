import { headers } from "next/headers";
import { whopsdk } from "@/lib/whop-sdk";
import { prisma } from "@/lib/db";
import { isCreatorOrAdmin } from "@/lib/access";
import { seedWhopDefaultsIfAllowed } from "@/lib/niche-defaults";
import { SkillAcceleratorClient } from "../../_components/skill-accelerator-client";
import { validateNicheKey } from "@/lib/validate-niche-key";

export default async function NicheWorkspacePage({
  params,
  searchParams,
}: {
  params: Promise<{ experienceId: string; nicheKey: string }>;
  searchParams?: Promise<{ preview?: string }>;
}) {
  const { experienceId, nicheKey } = await params;
  const resolvedSearchParams = await searchParams;
  const preview = resolvedSearchParams?.preview;

  const headerList = await headers();
  const { userId } = await whopsdk.verifyUserToken(headerList);

  // Seed defaults if needed
  await seedWhopDefaultsIfAllowed(experienceId);

  // Hard proof debug logging (dev only)
  if (process.env.NODE_ENV !== "production") {
    const presetCount = await (prisma as any).nichePreset.count({
      where: { experienceId },
    });
    console.log("[DEBUG] niche workspace - experienceId:", experienceId, "presetCount:", presetCount);
  }

  const [experience, user, access, profile] = await Promise.all([
    whopsdk.experiences.retrieve(experienceId),
    whopsdk.users.retrieve(userId),
    whopsdk.users.checkAccess(experienceId, { id: userId }),
    prisma.userProfile.findUnique({ where: { whopUserId: userId } }),
  ]);

  // Validate niche key still exists/enabled
  const validated = await validateNicheKey({ experienceId, nicheKey });

  const storedCustomNiche = (profile as any)?.customNiche ?? "";
  const initialCustomNiche = validated.nicheKey === "custom" ? storedCustomNiche : "";

  const displayName = user.name || `@${user.username}`;
  const isCreator = isCreatorOrAdmin(access);
  const effectiveIsCreator = isCreator && preview !== "member";

  return (
    <SkillAcceleratorClient
      experience={experience}
      access={access}
      displayName={displayName}
      experienceId={experienceId}
      initialNiche={validated.nicheKey}
      initialCustomNiche={initialCustomNiche}
      isCreator={false}
      preview={preview}
      nicheChangeMessage={validated.message}
      hideInlineNicheSelector={true}
      showDevTools={false}
    />
  );
}


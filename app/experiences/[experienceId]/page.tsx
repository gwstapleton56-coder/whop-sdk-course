import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { whopsdk } from "@/lib/whop-sdk";
import { seedWhopDefaultsIfAllowed } from "@/lib/niche-defaults";

export default async function ExperiencePage({
  params,
  searchParams,
}: {
  params: Promise<{ experienceId: string }>;
  searchParams?: Promise<{ preview?: string }>;
}) {
  const { experienceId } = await params;
  const resolvedSearchParams = await searchParams;
  const preview = resolvedSearchParams?.preview;

  const headerList = await headers();
  await whopsdk.verifyUserToken(headerList);

  await seedWhopDefaultsIfAllowed(experienceId);

  const qs = preview ? `?preview=${encodeURIComponent(preview)}` : "";
  redirect(`/experiences/${experienceId}/home${qs}`);
}

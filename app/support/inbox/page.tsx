import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { whopsdk } from "@/lib/whop-sdk";
import { prisma } from "@/lib/db";
import { isOwnerUserId } from "@/lib/is-owner";
import { BackButton } from "./_components/back-button";

export const runtime = "nodejs";

export default async function SupportInboxPage() {
  const { userId } = await whopsdk.verifyUserToken(await headers());

  // 🔒 Only YOU can view this page
  if (!isOwnerUserId(userId)) redirect("/");

  const tickets = await (prisma as any).supportTicket.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <BackButton />
          <h1 className="text-xl font-semibold text-slate-900">Support Inbox</h1>
        </div>
        <div className="text-sm text-slate-500">{tickets.length} tickets</div>
      </div>

      {tickets.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-500">
          No tickets yet.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {tickets.map((t: any) => (
            <div key={t.id} className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-sm font-medium text-slate-900">
                  {t.status?.toUpperCase?.() || "OPEN"}
                </div>
                <div className="text-xs text-slate-500">
                  {new Date(t.createdAt).toLocaleString()}
                </div>
              </div>

              <div className="mt-2 text-xs text-slate-500">
                <span className="font-medium">Experience:</span> {t.experienceId}{" "}
                • <span className="font-medium">User:</span> {t.whopUserId}
                {t.niche ? (
                  <>
                    {" "}
                    • <span className="font-medium">Niche:</span> {t.niche}
                  </>
                ) : null}
              </div>

              <div className="mt-3 whitespace-pre-wrap text-sm text-slate-900">
                {t.message}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


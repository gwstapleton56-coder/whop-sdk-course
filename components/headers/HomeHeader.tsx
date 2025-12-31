"use client";

import { Menu } from "lucide-react";
import { Button } from "@whop/react/components";
import { useRouter } from "next/navigation";

type HomeHeaderProps = {
  onMenuClick?: () => void;
  experienceId: string;
  displayName: string;
  username: string;
  avatarUrl?: string | null;
  isPro: boolean;
  proLoading: boolean;
};

export default function HomeHeader({ 
  onMenuClick, 
  experienceId,
  displayName,
  username,
  avatarUrl,
  isPro,
  proLoading,
}: HomeHeaderProps) {
  const router = useRouter();

  return (
    <header className="sticky top-0 z-50 w-full bg-white border-b border-gray-200">
      <div className="p-4 flex items-center justify-between">
        <button
          type="button"
          onClick={onMenuClick}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5 text-gray-700" />
        </button>
        
        <div className="text-sm font-semibold text-gray-900">Home</div>
        
        {/* Right side - User info and Pro/Upgrade */}
        <div className="flex items-center gap-3">
          {!proLoading && (
            <Button
              variant={isPro ? "soft" : "classic"}
              size="2"
              type="button"
              onClick={() =>
                isPro ? undefined : router.push(`/experiences/${experienceId}/upgrade`)
              }
              className="rounded-lg"
              disabled={isPro}
            >
              {isPro ? "Pro" : "Upgrade"}
            </Button>
          )}

          <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-3 py-2 shadow-sm">
            <div className="h-8 w-8 overflow-hidden rounded-full border border-gray-200 bg-gray-50 grid place-items-center text-[12px] font-semibold text-gray-700">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarUrl}
                  alt={displayName}
                  className="h-full w-full object-cover"
                />
              ) : (
                (displayName?.[0] || username?.[0] || "?").toUpperCase()
              )}
            </div>
            <div className="leading-tight">
              <div className="text-[13px] font-semibold text-gray-900">
                {displayName}
              </div>
              <div className="text-[11px] text-gray-500">@{username}</div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}


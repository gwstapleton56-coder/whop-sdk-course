"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@whop/react/components";
import { Menu, ChevronRight, Sparkles, Settings, HelpCircle, ArrowRight, TrendingUp, Scissors, HeartPulse, ShoppingBag, Dumbbell, Trophy, Home, MessageSquare } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { suggestIconForNiche } from "@/lib/niche-icon";
import HomeHeader from "@/components/headers/HomeHeader";
import PageHeader from "@/components/headers/PageHeader";

type Preset = {
  key: string;
  label: string;
  enabled: boolean;
  sortOrder?: number | null;
  icon?: string | null;
};

const iconMap: Record<string, LucideIcon> = {
  TrendingUp,
  Scissors,
  HeartPulse,
  ShoppingBag,
  Dumbbell,
  Sparkles,
  Trophy,
  Home,
};

function getNicheIconComponent(nicheKey: string, label: string, icon?: string | null): LucideIcon {
  // Use stored icon if available, otherwise auto-suggest
  const iconName = icon || suggestIconForNiche(label, nicheKey);
  return iconMap[iconName] || Sparkles;
}

type AppShellProps = {
  experienceId: string;
  displayName: string;
  username: string;
  avatarUrl?: string | null;
  presets: Preset[];
  isCreator: boolean;
  isOwner?: boolean;
  coachName?: string;
  children: React.ReactNode;
};

function getCurrentNicheKeyFromPath(pathname: string) {
  // /experiences/:id/n/:nicheKey
  const parts = pathname.split("/").filter(Boolean);
  const nIndex = parts.indexOf("n");
  if (nIndex >= 0 && parts[nIndex + 1]) return parts[nIndex + 1];
  return null;
}

const sidebarItem =
  "w-full rounded-xl px-3 py-2 text-sm text-slate-800 border border-transparent " +
  "transition-all duration-200 hover:border-blue-300/60 " +
  "hover:bg-white hover:shadow-[0_0_0_4px_rgba(59,130,246,0.10),0_14px_30px_rgba(59,130,246,0.10)]";

export const navRow = sidebarItem + " group relative flex items-center justify-between gap-3";

export function AppShell({
  experienceId,
  displayName,
  username,
  avatarUrl,
  presets: initialPresets,
  isCreator,
  isOwner = false,
  coachName = "AI Coach",
  children,
}: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const currentNicheKey = useMemo(
    () => (pathname ? getCurrentNicheKeyFromPath(pathname) : null),
    [pathname]
  );

  // Presets state - can be refreshed
  const [presets, setPresets] = useState<Preset[]>(initialPresets);

  // Pro status (client-side, single source of truth)
  const [isPro, setIsPro] = useState(false);
  const [proLoading, setProLoading] = useState(true);

  async function refreshPro() {
    try {
      setProLoading(true);
      // Pass experienceId so owners can get auto Pro access
      const res = await fetch(`/api/pro/status?experienceId=${encodeURIComponent(experienceId)}`, { cache: "no-store" });
      const data = await res.json().catch(() => null);
      setIsPro(Boolean(data?.isPro));
    } finally {
      setProLoading(false);
    }
  }

  async function refreshPresets() {
    try {
      const res = await fetch(`/api/experiences/${experienceId}/niche-presets`, {
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        if (data.presets && Array.isArray(data.presets)) {
          setPresets(data.presets);
        }
      }
    } catch (error) {
      console.error("Failed to refresh presets:", error);
    }
  }

  useEffect(() => {
    refreshPro();
    refreshPresets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refresh presets when window gains focus (e.g., after admin changes)
  useEffect(() => {
    const handleFocus = () => {
      refreshPresets();
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        refreshPresets();
      }
    };
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [experienceId]);

  // Sidebar drawer
  const [open, setOpen] = useState(false);

  const navPresets = useMemo(() => {
    const enabled = presets.filter((p) => p.enabled !== false);
    // Always ensure custom exists exactly once
    const hasCustom = enabled.some((p) => p.key === "custom");
    const list = hasCustom
      ? enabled
      : [...enabled, { key: "custom", label: "Custom", enabled: true }];
    // Sort by sortOrder then label
    return list.sort((a, b) => {
      const ao = a.sortOrder ?? 999;
      const bo = b.sortOrder ?? 999;
      if (ao !== bo) return ao - bo;
      return a.label.localeCompare(b.label);
    });
  }, [presets]);

  // Pro status is kept internally for feature gating, but no UI badge is displayed

  // Determine page title and subtitle based on pathname
  const isHomePage = pathname?.endsWith('/home') || pathname === `/experiences/${experienceId}` || pathname === `/experiences/${experienceId}/`;
  const isPracticePage = pathname?.includes('/n/');
  const isSupportPage = pathname?.includes('/support');
  const isAdminPage = pathname?.includes('/admin');
  const isUpgradePage = pathname?.includes('/upgrade');

  const isCoachPage = pathname?.includes('/coach') && !pathname?.includes('/admin');

  const getPageTitle = () => {
    if (isCoachPage) return coachName;
    if (isPracticePage) return "Practice";
    if (isSupportPage) return "Support / Docs";
    if (isAdminPage) return "Admin Panel";
    if (isUpgradePage) return "Upgrade";
    return "Practice";
  };

  const getPageSubtitle = () => {
    if (isCoachPage) return "Personal coaching that adapts to your niche";
    if (isPracticePage && currentNicheKey) {
      const preset = presets.find(p => p.key === currentNicheKey);
      return preset?.label || currentNicheKey;
    }
    if (isSupportPage) return "Help Center";
    if (isAdminPage) return "Creator Settings";
    if (isPracticePage) return "Sharpen your decision-making";
    return undefined;
  };

  return (
    <div className={isCoachPage ? "min-h-screen" : "min-h-screen bg-[radial-gradient(1200px_circle_at_20%_-10%,rgba(59,130,246,0.08),transparent_60%),radial-gradient(900px_circle_at_80%_0%,rgba(99,102,241,0.06),transparent_55%),linear-gradient(to_bottom,rgba(248,250,252,1),rgba(245,247,250,1))]"}>
      {/* Header - Hidden on coach page */}
      {!isCoachPage && (
        <>
          {isHomePage ? (
            <HomeHeader
              onMenuClick={() => setOpen(true)}
              experienceId={experienceId}
              displayName={displayName}
              username={username}
              avatarUrl={avatarUrl}
              isPro={isPro}
              proLoading={proLoading}
            />
          ) : (
            <PageHeader
              title={getPageTitle()}
              subtitle={getPageSubtitle()}
              onMenuClick={() => setOpen(true)}
              experienceId={experienceId}
              displayName={displayName}
              username={username}
              avatarUrl={avatarUrl}
              isPro={isPro}
              proLoading={proLoading}
            />
          )}
        </>
      )}

      {/* Sidebar Drawer */}
      {open && (
        <div className="fixed inset-0 z-[60]">
          <div
            className="absolute inset-0 bg-black/20 pointer-events-auto"
            onClick={() => setOpen(false)}
          />
          <div className="fixed left-0 top-0 h-full w-[320px] bg-white p-4 shadow-xl pointer-events-auto z-[70] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div className="text-[13px] font-semibold text-gray-900">
                Navigation
              </div>
              <Button
                variant="classic"
                size="2"
                type="button"
                onClick={() => setOpen(false)}
              >
                ✕
              </Button>
            </div>

            <div className="mt-4 flex flex-col gap-2">
              <Link
                href={`/experiences/${experienceId}/home`}
                onClick={() => setOpen(false)}
                className={navRow}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-9 w-9 rounded-lg border border-slate-200 bg-white grid place-items-center">
                      <Home className="h-4 w-4 text-slate-700" />
                    </div>
                    <span className="text-sm font-medium text-slate-800 truncate">
                      Home
                    </span>
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-400 opacity-60" />
                </div>
              </Link>

              <Link
                href={`/experiences/${experienceId}/coach`}
                onClick={() => setOpen(false)}
                className={navRow}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-9 w-9 rounded-lg border border-slate-200 bg-white grid place-items-center">
                      <MessageSquare className="h-4 w-4 text-slate-700" />
                    </div>
                    <span className="text-sm font-medium text-slate-800 truncate">
                      {coachName}
                    </span>
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-400 opacity-60" />
                </div>
              </Link>

              <div className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                Switch niche
              </div>

              <div className="flex flex-col gap-2">
                {navPresets.map((p) => {
                  const active = currentNicheKey === p.key;
                  const Icon = getNicheIconComponent(p.key, p.label, p.icon);
                  return (
                    <Link
                      key={p.key}
                      href={`/experiences/${experienceId}/n/${p.key}`}
                      onClick={() => setOpen(false)}
                      className={navRow + (active ? " border-blue-500/60 bg-blue-50/90" : "")}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`h-9 w-9 rounded-lg border border-slate-200 bg-white grid place-items-center ${
                            active ? "border-blue-300 bg-blue-50" : ""
                          }`}>
                            <Icon className="h-4 w-4 text-slate-700" />
                          </div>
                          <span className="text-sm font-medium text-slate-800 truncate">
                            {p.label}
                          </span>
                        </div>
                        <ArrowRight className="h-4 w-4 text-slate-400 opacity-60" />
                      </div>
                    </Link>
                  );
                })}
              </div>

              <div className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                Account
              </div>

              <Link
                href={`/experiences/${experienceId}/upgrade`}
                onClick={() => setOpen(false)}
                className={navRow}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-9 w-9 rounded-lg border border-slate-200 bg-white grid place-items-center">
                      <Sparkles className="h-4 w-4 text-slate-700" />
                    </div>
                    <span className="text-sm font-medium text-slate-800 truncate">
                      Upgrade
                    </span>
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-400 opacity-60" />
                </div>
              </Link>

              {isCreator && (
                <Link
                  href={`/experiences/${experienceId}/admin`}
                  onClick={() => setOpen(false)}
                  className={navRow}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-9 w-9 rounded-lg border border-slate-200 bg-white grid place-items-center">
                        <Settings className="h-4 w-4 text-slate-700" />
                      </div>
                      <span className="text-sm font-medium text-slate-800 truncate">
                        Admin panel
                      </span>
                    </div>
                    <ArrowRight className="h-4 w-4 text-slate-400 opacity-60" />
                  </div>
                </Link>
              )}

              <Link
                href={`/experiences/${experienceId}/support`}
                onClick={() => setOpen(false)}
                className={navRow}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-9 w-9 rounded-lg border border-slate-200 bg-white grid place-items-center">
                      <HelpCircle className="h-4 w-4 text-slate-700" />
                    </div>
                    <span className="text-sm font-medium text-slate-800 truncate">
                      Support / Docs
                    </span>
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-400 opacity-60" />
                </div>
              </Link>
            </div>
          </div>
        </div>
      )}

        {/* Page content */}
        <main className={isCoachPage ? "min-h-screen w-full" : "min-h-screen w-full bg-gradient-to-b from-slate-50 to-white"}>
          {isCoachPage ? (
            <div className="w-full h-full">{children}</div>
          ) : (
            <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-10">{children}</div>
          )}
        </main>
    </div>
  );
}


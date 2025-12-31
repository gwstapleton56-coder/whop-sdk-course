"use client";

import { useState } from "react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { NewSessionDialog } from "@/components/ui/NewSessionDialog";

type ResetMode = "KEEP_NICHE" | "CHANGE_NICHE";

type Props = {
  experienceId: string;
  isUserMadeCustomNiche?: boolean;
};

export function ResetSessionModal({ experienceId, isUserMadeCustomNiche = false }: Props) {
  const [open, setOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState<ResetMode | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function doReset(mode: ResetMode) {
    try {
      setError(null);
      setBusy(mode);

      const res = await fetch("/api/session/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ experienceId, mode }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || `Reset failed (${res.status})`);
      }

      // easiest/cleanest: reload so server props + client state rehydrate from DB
      window.location.reload();
    } catch (e: any) {
      setError(e?.message || "Reset failed");
    } finally {
      setBusy(null);
    }
  }

  function handleClick() {
    // For presets/admin niches: simple confirmation only
    if (!isUserMadeCustomNiche) {
      setConfirmOpen(true);
      return;
    }

    // For user-made custom niches: show full modal with niche switch option
    setOpen(true);
  }

  function handleConfirm() {
    setConfirmOpen(false);
    doReset("KEEP_NICHE");
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className="w-full sm:w-auto cursor-pointer rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
        style={{
          backgroundColor: '#2563eb',
          color: '#ffffff',
        }}
      >
        Start a fresh session
      </button>

      <ConfirmDialog
        open={confirmOpen}
        title="Start a new session?"
        description="This will clear your current drills and progress for this session."
        confirmText="Start new session"
        cancelText="Cancel"
        onConfirm={handleConfirm}
        onCancel={() => setConfirmOpen(false)}
      />

      <NewSessionDialog
        open={open && isUserMadeCustomNiche}
        title="Start a new session?"
        description="This clears your current objective, practice selection, drills, and progress."
        keepNicheText="Keep niche & start new session"
        changeNicheText="Change niche & start new session"
        cancelText="Cancel"
        onKeepNiche={() => doReset("KEEP_NICHE")}
        onChangeNiche={() => doReset("CHANGE_NICHE")}
        onCancel={() => setOpen(false)}
        busy={busy === "KEEP_NICHE" ? "keep" : busy === "CHANGE_NICHE" ? "change" : null}
        error={error}
      />
    </>
  );
}

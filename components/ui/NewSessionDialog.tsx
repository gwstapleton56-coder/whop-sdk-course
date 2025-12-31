"use client";

type Props = {
  open: boolean;
  title?: string;
  description?: string;
  keepNicheText?: string;
  changeNicheText?: string;
  cancelText?: string;
  onKeepNiche: () => void;
  onChangeNiche: () => void;
  onCancel: () => void;
  busy?: "keep" | "change" | null;
  error?: string | null;
};

export function NewSessionDialog({
  open,
  title = "Start a new session?",
  description = "This clears your current objective, practice selection, drills, and progress.",
  keepNicheText = "Keep niche & start new session",
  changeNicheText = "Change niche & start new session",
  cancelText = "Cancel",
  onKeepNiche,
  onChangeNiche,
  onCancel,
  busy = null,
  error = null,
}: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999]">
      {/* premium overlay */}
      <div
        className="absolute inset-0 bg-black/55 backdrop-blur-sm"
        onClick={busy ? undefined : onCancel}
      />

      {/* modal */}
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl border border-black/10 bg-white shadow-2xl">
          <div className="p-5">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h3 className="text-lg font-semibold text-black">{title}</h3>
                <p className="mt-2 text-sm text-black/70">{description}</p>
              </div>
              <button
                className="text-black/50 hover:text-black/70 transition"
                onClick={busy ? undefined : onCancel}
                aria-label="Close"
                type="button"
              >
                ✕
              </button>
            </div>

            {error && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="flex flex-col gap-3">
              <button
                className="h-10 px-4 rounded-xl bg-blue-600 text-white hover:bg-blue-700 cursor-pointer transition disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={onKeepNiche}
                disabled={!!busy}
                type="button"
                style={{
                  backgroundColor: busy === "keep" ? '#1d4ed8' : '#2563eb',
                  color: '#ffffff',
                }}
              >
                {busy === "keep" ? "Starting…" : keepNicheText}
              </button>

              <button
                className="h-10 px-4 rounded-xl border border-black/15 bg-white text-black hover:bg-black/5 cursor-pointer transition disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={onChangeNiche}
                disabled={!!busy}
                type="button"
              >
                {busy === "change" ? "Starting…" : changeNicheText}
              </button>

              <button
                className="h-10 px-4 rounded-xl border border-black/15 bg-white text-black hover:bg-black/5 cursor-pointer transition disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={onCancel}
                disabled={!!busy}
                type="button"
              >
                {cancelText}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}




"use client";

type Props = {
  open: boolean;
  title?: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  open,
  title = "Start a new session?",
  description = "This will clear your current drills and progress for this session.",
  confirmText = "Start new session",
  cancelText = "Cancel",
  onConfirm,
  onCancel,
}: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999]">
      {/* premium overlay */}
      <div
        className="absolute inset-0 bg-black/55 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* modal */}
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl border border-black/10 bg-white shadow-2xl">
          <div className="p-5">
            <h3 className="text-lg font-semibold text-black">{title}</h3>
            <p className="mt-2 text-sm text-black/70">{description}</p>

            <div className="mt-5 flex gap-3 justify-end">
              <button
                className="h-10 px-4 rounded-xl border border-black/15 bg-white text-black hover:bg-black/5 cursor-pointer transition"
                onClick={onCancel}
                type="button"
              >
                {cancelText}
              </button>

              <button
                className="h-10 px-4 rounded-xl bg-blue-600 text-white hover:bg-blue-700 cursor-pointer transition"
                onClick={onConfirm}
                type="button"
                style={{
                  backgroundColor: '#2563eb',
                  color: '#ffffff',
                }}
              >
                {confirmText}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}





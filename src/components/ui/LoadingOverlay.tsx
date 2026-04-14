"use client";

export function LoadingOverlay({
  visible,
  label = "Loading...",
}: {
  visible: boolean;
  label?: string;
}) {
  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-[2px]">
      <div className="campus-paper-card flex min-w-[220px] items-center gap-3 rounded-xl px-4 py-3">
        <span className="loading-dot" aria-hidden="true" />
        <div>
          <p className="text-sm font-medium text-slate-900">{label}</p>
          <p className="text-xs text-slate-600">Please wait a moment</p>
        </div>
      </div>
    </div>
  );
}

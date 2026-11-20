"use client";

import { cx } from "@/lib/ui";

export interface LoadingProps {
  label?: string;
  fullPage?: boolean;
  className?: string;
}

export function Loading({ label = "Cargando…", fullPage = false, className }: LoadingProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cx(
        "flex items-center justify-center gap-3 text-sm text-slate-600",
        fullPage ? "min-h-[60vh]" : "py-8",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-slate-300 border-t-slate-800"
      />
      <span>{label}</span>
    </div>
  );
}

export default Loading;

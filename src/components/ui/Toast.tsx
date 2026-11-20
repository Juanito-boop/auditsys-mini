"use client";

import { useEffect } from "react";
import { cx } from "@/lib/ui";

export interface ToastProps {
  message: string;
  tone?: "success" | "error";
  onClose: () => void;
  duration?: number;
}

export function Toast({ message, tone = "success", onClose, duration = 5000 }: ToastProps) {
  useEffect(() => {
    if (duration <= 0) return;
    const temporizador = window.setTimeout(onClose, duration);
    return () => window.clearTimeout(temporizador);
  }, [duration, onClose]);

  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cx(
        "fixed bottom-4 right-4 z-50 flex max-w-[calc(100vw-2rem)] items-start gap-3 rounded-lg border px-4 py-3 text-sm shadow-lg",
        tone === "error"
          ? "border-red-200 bg-red-50 text-red-900"
          : "border-emerald-200 bg-emerald-50 text-emerald-900",
      )}
    >
      <span className="flex-1 break-words">{message}</span>
      <button
        type="button"
        onClick={onClose}
        aria-label="Cerrar notificación"
        className="shrink-0 rounded p-0.5 opacity-70 hover:opacity-100"
      >
        <svg
          viewBox="0 0 20 20"
          aria-hidden="true"
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <path d="M5 5l10 10M15 5L5 15" />
        </svg>
      </button>
    </div>
  );
}

export default Toast;

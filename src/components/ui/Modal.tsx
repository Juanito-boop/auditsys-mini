/** Ventana modal reutilizable para los formularios de alta y edición. */

"use client";

import { useEffect, useId } from "react";
import type { ReactNode } from "react";
import { cx } from "@/lib/ui";

export interface ModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  ancho?: "md" | "lg";
}

export function Modal({ open, title, onClose, children, footer, ancho = "md" }: ModalProps) {
  const tituloId = useId();

  useEffect(() => {
    if (!open) return;

    const alPulsarTecla = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") onClose();
    };
    document.addEventListener("keydown", alPulsarTecla);

    const desbordamientoAnterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", alPulsarTecla);
      document.body.style.overflow = desbordamientoAnterior;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="print-hidden fixed inset-0 z-40 flex items-start justify-center overflow-y-auto p-3 sm:items-center sm:p-6">
      <div
        aria-hidden="true"
        className="fixed inset-0 bg-slate-900/50"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={tituloId}
        className={cx(
          "relative my-auto w-full rounded-xl bg-white shadow-xl",
          ancho === "lg" ? "max-w-3xl" : "max-w-xl",
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <h2 id={tituloId} className="text-lg font-semibold text-slate-900">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar ventana"
            className="shrink-0 rounded-lg p-1.5 text-slate-600 hover:bg-slate-100"
          >
            <svg viewBox="0 0 20 20" aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M5 5l10 10M15 5L5 15" />
            </svg>
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto px-5 py-5">{children}</div>
        {footer ? (
          <div className="flex flex-col-reverse gap-2 border-t border-slate-200 px-5 py-4 sm:flex-row sm:justify-end">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default Modal;

/** Registra la intención de impresión y solo después abre el diálogo del navegador. */

"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Toast } from "@/components/ui/Toast";
import { apiPost } from "@/lib/api-client";
import { cx, mensajeError } from "@/lib/ui";
import type { PrintRequestDTO, PrintRequestOrigin } from "@/shared/types";

const MENSAJE_ERROR =
  "No se pudo registrar la solicitud de impresión. No se inició la impresión; inténtalo de nuevo.";

export interface PrintReportButtonProps {
  auditId: number;
  origin: PrintRequestOrigin;
  className?: string;
  onRegistered?: () => void;
}

export function PrintReportButton({ auditId, origin, className, onRegistered }: PrintReportButtonProps) {
  const [enviando, setEnviando] = useState(false);
  const [detalleError, setDetalleError] = useState<string | null>(null);
  const requestKeyRef = useRef<string | null>(null);
  const enCursoRef = useRef(false);

  const imprimir = async () => {
    // El estado aún no se ha actualizado cuando llega un segundo clic: el ref lo bloquea.
    if (enCursoRef.current) return;
    enCursoRef.current = true;
    setEnviando(true);
    setDetalleError(null);

    if (requestKeyRef.current === null) {
      requestKeyRef.current = crypto.randomUUID();
    }
    const requestKey = requestKeyRef.current;

    try {
      await apiPost<PrintRequestDTO>(`/api/audits/${auditId}/report/print-requests`, {
        origin,
        requestKey,
      });
      // La clave solo se descarta después del éxito: así un reintento sería idempotente.
      requestKeyRef.current = null;
      window.print();
      onRegistered?.();
    } catch (error: unknown) {
      // No se imprime y se conserva la clave para el reintento.
      setDetalleError(mensajeError(error));
    } finally {
      enCursoRef.current = false;
      setEnviando(false);
    }
  };

  return (
    <>
      <div className={cx("flex flex-col gap-1", className)}>
        <Button loading={enviando} disabled={enviando} onClick={() => void imprimir()}>
          Imprimir / Guardar como PDF
        </Button>
        {detalleError ? (
          <p className="text-xs text-red-700" aria-live="polite">
            {detalleError}
          </p>
        ) : null}
      </div>
      {detalleError ? (
        <Toast message={MENSAJE_ERROR} tone="error" onClose={() => setDetalleError(null)} />
      ) : null}
    </>
  );
}

export default PrintReportButton;

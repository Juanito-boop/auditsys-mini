/** Historial de solicitudes de impresión/descarga de una auditoría (sin correos). */

"use client";

import { Card } from "@/components/ui/Card";
import { ErrorState } from "@/components/ui/ErrorState";
import { Loading } from "@/components/ui/Loading";
import { useApiResource } from "@/lib/use-api";
import { formatDate } from "@/lib/ui";
import type { PrintRequestOrigin, PrintRequestsDTO } from "@/shared/types";

const ETIQUETAS_ORIGEN: Record<PrintRequestOrigin, string> = {
  resultados: "Resultados",
  informe: "Informe",
};

export interface PrintRequestHistoryProps {
  auditId: number;
}

export function PrintRequestHistory({ auditId }: PrintRequestHistoryProps) {
  const solicitudes = useApiResource<PrintRequestsDTO>(
    `/api/audits/${auditId}/report/print-requests`,
  );

  return (
    <Card className="print-hidden p-4 sm:p-5">
      <h2 className="text-lg font-semibold text-slate-900">
        Registro de solicitudes de impresión/descarga
      </h2>
      <p className="mt-1 text-sm text-slate-600">
        Se registran solicitudes de impresión o guardado como PDF; no son descargas confirmadas de
        PDF, porque el diálogo del navegador puede cancelarse.
      </p>

      {solicitudes.loading ? <Loading label="Cargando solicitudes…" /> : null}

      {solicitudes.error ? (
        <div className="mt-4">
          <ErrorState
            title="No se pudo cargar el registro de solicitudes"
            message={solicitudes.error}
            onRetry={solicitudes.reload}
          />
        </div>
      ) : null}

      {!solicitudes.loading && !solicitudes.error && solicitudes.data ? (
        <div className="mt-4 space-y-5">
          <p className="text-sm text-slate-700">
            Total de solicitudes:{" "}
            <span className="font-semibold tabular-nums text-slate-900">
              {solicitudes.data.total}
            </span>
          </p>

          {solicitudes.data.total === 0 ? (
            <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
              Aún no hay solicitudes registradas.
            </p>
          ) : (
            <>
              <section aria-labelledby={`solicitudes-por-usuario-${auditId}`}>
                <h3
                  id={`solicitudes-por-usuario-${auditId}`}
                  className="text-sm font-semibold text-slate-900"
                >
                  Desglose por usuario
                </h3>
                <ul className="mt-2 divide-y divide-slate-200 rounded-lg border border-slate-200">
                  {solicitudes.data.porUsuario.map((usuario) => (
                    <li
                      key={usuario.userId}
                      className="flex flex-col gap-1 p-3 text-sm sm:flex-row sm:items-center sm:justify-between"
                    >
                      <span className="font-medium text-slate-900">{usuario.userName}</span>
                      <span className="text-slate-600">
                        {usuario.total} {usuario.total === 1 ? "solicitud" : "solicitudes"}
                        {" · Última solicitud: "}
                        {formatDate(usuario.ultimaSolicitudEn)}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>

              <section aria-labelledby={`solicitudes-recientes-${auditId}`}>
                <h3
                  id={`solicitudes-recientes-${auditId}`}
                  className="text-sm font-semibold text-slate-900"
                >
                  Solicitudes recientes
                </h3>
                <ul className="mt-2 divide-y divide-slate-200 rounded-lg border border-slate-200">
                  {solicitudes.data.solicitudes.map((solicitud) => (
                    <li
                      key={solicitud.id}
                      className="flex flex-col gap-1 p-3 text-sm sm:flex-row sm:items-center sm:justify-between"
                    >
                      <span className="font-medium text-slate-900">{solicitud.userName}</span>
                      <span className="text-slate-600">
                        {ETIQUETAS_ORIGEN[solicitud.origin]}
                        {" · "}
                        {formatDate(solicitud.requestedAt)}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            </>
          )}
        </div>
      ) : null}
    </Card>
  );
}

export default PrintRequestHistory;

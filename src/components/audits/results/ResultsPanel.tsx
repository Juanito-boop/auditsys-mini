/** Panel de resultados e informe: indicadores, fórmula, limitaciones e impresión. */

"use client";

import { useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { ErrorState } from "@/components/ui/ErrorState";
import { Loading } from "@/components/ui/Loading";
import { PrintReportButton } from "@/components/audits/results/PrintReportButton";
import { PrintRequestHistory } from "@/components/audits/results/PrintRequestHistory";
import { ReportView } from "@/components/audits/results/ReportView";
import { useApiResource } from "@/lib/use-api";
import { formatPercent } from "@/lib/ui";
import type { ReportDTO, ResultsDTO } from "@/shared/types";

interface ResultsPanelProps {
  auditId: number;
}

export function ResultsPanel({ auditId }: ResultsPanelProps) {
  const resultados = useApiResource<ResultsDTO>(`/api/audits/${auditId}/results`);
  const reporte = useApiResource<ReportDTO>(`/api/audits/${auditId}/report`);
  const [version, setVersion] = useState(0);

  if (resultados.loading || reporte.loading) {
    return <Loading label="Cargando resultados e informe…" />;
  }

  if (resultados.error) {
    return (
      <ErrorState
        title="No se pudieron cargar los resultados"
        message={resultados.error}
        onRetry={resultados.reload}
      />
    );
  }

  if (reporte.error) {
    return (
      <ErrorState
        title="No se pudo cargar el informe"
        message={reporte.error}
        onRetry={reporte.reload}
      />
    );
  }

  if (!resultados.data || !reporte.data) return <Loading label="Cargando resultados e informe…" />;

  const { counts, indicators } = resultados.data;

  return (
    <div className="space-y-4">
      <div className="print-hidden flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-semibold text-slate-900">Resultados e informe</h2>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Link
            href={`/audits/${auditId}/report`}
            className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-800 hover:bg-slate-50"
          >
            Ver informe imprimible
          </Link>
          <PrintReportButton
            auditId={auditId}
            origin="resultados"
            onRegistered={() => setVersion((v) => v + 1)}
          />
        </div>
      </div>

      <Card className="print-hidden p-4 sm:p-5">
        <p className="text-sm text-slate-600">
          Organización: <span className="font-medium text-slate-900">{resultados.data.audit.organization}</span>
          {" · "}Estado: <span className="font-medium text-slate-900">{resultados.data.audit.status}</span>
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {[
            ["% implementados", formatPercent(indicators.implementados)],
            ["% parciales", formatPercent(indicators.parcialmenteImplementados)],
            ["% no implementados", formatPercent(indicators.noImplementados)],
            ["Denominador", String(indicators.denominador)],
            ["Evaluados", String(counts.evaluados)],
            ["Pendientes", String(counts.pendientes)],
            ["No aplicables", String(counts.noAplicables)],
            ["Hallazgos sin recomendación", String(counts.hallazgosSinRecomendacion)],
          ].map(([etiqueta, valor]) => (
            <div key={etiqueta} className="rounded-lg bg-slate-50 p-3">
              <p className="text-xs text-slate-500">{etiqueta}</p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-slate-900">{valor}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 space-y-3">
          <div className="rounded-lg border border-slate-200 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Fórmula</p>
            <p className="mt-1 break-words text-sm text-slate-800">{indicators.formula}</p>
          </div>
          <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-amber-900">
            <p className="text-sm font-semibold">Limitaciones</p>
            <ul className="mt-1 list-disc space-y-1 pl-5 text-sm">
              {indicators.limitaciones.map((limitacion) => (
                <li key={limitacion}>{limitacion}</li>
              ))}
            </ul>
          </div>
          {resultados.data.avisos.length ? (
            <div className="rounded-lg border border-slate-200 p-3">
              <p className="text-sm font-semibold text-slate-900">Avisos</p>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-slate-700">
                {resultados.data.avisos.map((aviso) => (
                  <li key={aviso}>{aviso}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </Card>

      <PrintRequestHistory key={version} auditId={auditId} />

      <ReportView reporte={reporte.data} />
    </div>
  );
}

export default ResultsPanel;

/** Vista de informe imprimible con todas sus secciones desde /api/audits/[id]/report. */

"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { PrintReportButton } from "@/components/audits/results/PrintReportButton";
import { ReportView } from "@/components/audits/results/ReportView";
import { ErrorState } from "@/components/ui/ErrorState";
import { Loading } from "@/components/ui/Loading";
import { useApiResource } from "@/lib/use-api";
import type { ReportDTO } from "@/shared/types";

function idDeParametro(valor: string | string[] | undefined): string {
  if (Array.isArray(valor)) return valor[0] ?? "";
  return valor ?? "";
}

export default function ReportPage() {
  const parametros = useParams();
  const id = Number(idDeParametro(parametros.id));
  const reporte = useApiResource<ReportDTO>(id > 0 ? `/api/audits/${id}/report` : null);

  if (reporte.loading) return <Loading label="Cargando informe…" />;

  if (reporte.error) {
    return (
      <div className="mx-auto max-w-xl">
        <ErrorState
          title="No se pudo cargar el informe"
          message={reporte.error}
          onRetry={reporte.reload}
        />
      </div>
    );
  }

  if (!reporte.data) return <Loading label="Cargando informe…" />;

  return (
    <div className="space-y-4">
      <div className="print-hidden flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Informe de auditoría</h1>
          <p className="mt-1 text-sm text-slate-600">
            {reporte.data.portada.organization} · Auditoría #{id}
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Link
            href={`/audits/${id}?tab=resultados`}
            className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-800 hover:bg-slate-50"
          >
            Volver a la auditoría
          </Link>
          <PrintReportButton auditId={id} origin="informe" />
        </div>
      </div>
      <ReportView reporte={reporte.data} />
    </div>
  );
}

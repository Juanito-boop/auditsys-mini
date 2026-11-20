/** Panel de control: indicadores globales, gráficas y avisos desde /api/dashboard. */

"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { Card } from "@/components/ui/Card";
import { ErrorState } from "@/components/ui/ErrorState";
import { Loading } from "@/components/ui/Loading";
import { ToneBadge } from "@/components/ui/ToneBadge";
import { useApiResource } from "@/lib/use-api";
import { formatPercent, statusLabel } from "@/lib/ui";
import { AVISO_NO_CERTIFICA } from "@/shared/constants";
import type { DashboardDTO } from "@/shared/types";

const DashboardCharts = dynamic(
  () => import("@/components/dashboard/DashboardCharts").then((modulo) => modulo.DashboardCharts),
  { ssr: false, loading: () => <Loading label="Cargando gráficas…" /> },
);

interface TarjetaProps {
  etiqueta: string;
  valor: string;
  detalle?: string;
}

function Tarjeta({ etiqueta, valor, detalle }: TarjetaProps) {
  return (
    <Card className="p-4 sm:p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{etiqueta}</p>
      <p className="mt-2 break-words text-2xl font-semibold tracking-tight text-slate-900">{valor}</p>
      {detalle ? <p className="mt-1 text-xs text-slate-500">{detalle}</p> : null}
    </Card>
  );
}

export default function DashboardPage() {
  const { data, loading, error, reload } = useApiResource<DashboardDTO>("/api/dashboard");

  if (loading) return <Loading label="Cargando el panel…" />;

  if (error) {
    return (
      <div className="mx-auto max-w-xl">
        <ErrorState title="No se pudo cargar el panel" message={error} onRetry={reload} />
      </div>
    );
  }

  if (!data) return <Loading label="Cargando el panel…" />;

  const { resumen } = data;
  const porEstado = (Object.keys(resumen.porEstado) as Array<keyof typeof resumen.porEstado>).map(
    (estado) => ({ estado, total: resumen.porEstado[estado] }),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Panel de control</h1>
          <p className="mt-1 text-sm text-slate-600">
            Indicadores globales de las auditorías registradas.
          </p>
        </div>
        <Link
          href="/audits?crear=1"
          className="print-hidden inline-flex h-10 w-full items-center justify-center rounded-lg bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800 sm:w-auto"
        >
          Crear auditoría
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Tarjeta etiqueta="Total de auditorías" valor={String(resumen.totalAuditorias)} />
        <Card className="p-4 sm:p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Auditorías por estado</p>
          <ul className="mt-3 space-y-2">
            {porEstado.map(({ estado, total }) => (
              <li key={estado} className="flex items-center justify-between gap-2 text-sm">
                <ToneBadge tone={estado === "cerrada" ? "success" : estado === "en_curso" ? "warning" : "pending"}>
                  {statusLabel(estado)}
                </ToneBadge>
                <span className="font-semibold tabular-nums text-slate-900">{total}</span>
              </li>
            ))}
          </ul>
        </Card>
        <Tarjeta
          etiqueta="Cumplimiento promedio"
          valor={formatPercent(resumen.cumplimientoPromedio)}
          detalle="Sobre controles evaluados, excluidos los no aplicables."
        />
        <Tarjeta etiqueta="Total de hallazgos" valor={String(resumen.totalHallazgos)} />
      </div>

      {data.avisos.length ? (
        <Card className="border-amber-200 bg-amber-50 p-4 sm:p-5">
          <h2 className="text-sm font-semibold text-amber-900">Avisos y limitaciones</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-amber-900">
            {data.avisos.map((aviso) => (
              <li key={aviso}>{aviso}</li>
            ))}
          </ul>
        </Card>
      ) : null}

      {data.estaVacio ? (
        <Card className="p-6 sm:p-8">
          <h2 className="text-base font-semibold text-slate-900">Todavía no hay auditorías</h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
            Crea la primera auditoría para evaluar controles, registrar evidencias y consultar los
            indicadores. No se muestran datos de ejemplo.
          </p>
          <Link
            href="/audits?crear=1"
            className="print-hidden mt-4 inline-flex h-10 items-center justify-center rounded-lg bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800"
          >
            Crear auditoría
          </Link>
        </Card>
      ) : (
        <>
          <DashboardCharts datos={data} />

          <Card className="min-w-0 p-4 sm:p-5">
            <h2 className="text-sm font-semibold text-slate-900">Controles con más incumplimientos</h2>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                    <th scope="col" className="py-2 pr-3 font-medium">Código</th>
                    <th scope="col" className="py-2 pr-3 font-medium">Nombre</th>
                    <th scope="col" className="py-2 pr-3 font-medium">Tema</th>
                    <th scope="col" className="py-2 pr-3 text-right font-medium">Hallazgos</th>
                    <th scope="col" className="py-2 text-right font-medium">Auditorías afectadas</th>
                  </tr>
                </thead>
                <tbody>
                  {data.controlesConMasIncumplimientos.length ? (
                    data.controlesConMasIncumplimientos.map((control) => (
                      <tr key={control.controlId} className="border-b border-slate-100 last:border-0">
                        <td className="py-2.5 pr-3 font-medium tabular-nums text-slate-900">{control.code}</td>
                        <td className="py-2.5 pr-3 text-slate-700">{control.name}</td>
                        <td className="py-2.5 pr-3 text-slate-600">{statusLabel(control.theme)}</td>
                        <td className="py-2.5 pr-3 text-right tabular-nums text-slate-900">{control.hallazgos}</td>
                        <td className="py-2.5 text-right tabular-nums text-slate-900">{control.auditoriasAfectadas}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-sm text-slate-500">
                        No hay incumplimientos registrados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      <p className="text-xs leading-relaxed text-slate-500">{AVISO_NO_CERTIFICA}</p>
    </div>
  );
}

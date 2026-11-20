/** Informe imprimible: todas las secciones se renderizan desde ReportDTO. */

"use client";

import type { ReactNode } from "react";
import { Card } from "@/components/ui/Card";
import { ToneBadge, tonoControl, tonoSeveridad } from "@/components/ui/ToneBadge";
import { formatDate, formatPercent, statusLabel } from "@/lib/ui";
import type { Priority, ReportDTO } from "@/shared/types";

const ETIQUETA_PRIORIDAD: Record<Priority, string> = {
  baja: "Baja",
  media: "Media",
  alta: "Alta",
};

function Seccion({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="break-inside-avoid-page">
      <Card className="p-4 sm:p-5 print:shadow-none">
        <h2 className="text-base font-semibold text-slate-900">{titulo}</h2>
        <div className="mt-3 text-sm leading-relaxed text-slate-700">{children}</div>
      </Card>
    </section>
  );
}

function TablaSimple({
  cabeceras,
  filas,
}: {
  cabeceras: string[];
  filas: Array<Array<ReactNode>>;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[420px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-slate-200">
            {cabeceras.map((cabecera) => (
              <th key={cabecera} scope="col" className="py-2 pr-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                {cabecera}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filas.map((fila, indice) => (
            <tr key={indice} className="border-b border-slate-100 last:border-0">
              {fila.map((celda, columna) => (
                <td key={columna} className="py-2 pr-3 align-top text-slate-700">
                  {celda}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ReportView({ reporte }: { reporte: ReportDTO }) {
  const { meta, portada, resultados, anexoEvidencias, limitaciones } = reporte;
  const { counts, indicators, avisos } = resultados;

  return (
    <article id="print-report" className="space-y-4">
      <Seccion titulo={meta.titulo}>
        <p className="text-slate-600">Generado el {formatDate(meta.generadoEn)}.</p>
        <p className="mt-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 font-medium text-amber-900">
          {meta.avisoNoCertifica}
        </p>
      </Seccion>

      <Seccion titulo="Portada de la auditoría">
        <dl className="grid gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Organización</dt>
            <dd className="break-words text-slate-900">{portada.organization}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Auditor</dt>
            <dd className="break-words text-slate-900">{portada.auditor}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Fecha de auditoría</dt>
            <dd>{formatDate(portada.audit_date)}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Estado</dt>
            <dd className="mt-0.5">
              <ToneBadge tone={portada.status === "cerrada" ? "success" : portada.status === "en_curso" ? "warning" : "pending"}>
                {statusLabel(portada.status)}
              </ToneBadge>
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Creada el</dt>
            <dd>{formatDate(portada.created_at)}</dd>
          </div>
        </dl>
        <div className="mt-4 space-y-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Objetivo</p>
            <p className="whitespace-pre-line break-words">{portada.objective}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Alcance</p>
            <p className="whitespace-pre-line break-words">{portada.scope}</p>
          </div>
        </div>
      </Seccion>

      <Seccion titulo="Metodología y referentes">
        <p className="whitespace-pre-line">{meta.metodologia}</p>
        <ul className="mt-3 list-disc space-y-1 pl-5">
          {meta.referentes.map((referente) => (
            <li key={referente}>{referente}</li>
          ))}
        </ul>
        <p className="mt-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 font-medium text-amber-900">
          {meta.avisoNoCertifica}
        </p>
      </Seccion>

      <Seccion titulo="Resultados">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {[
            ["Total de controles", counts.totalControles],
            ["Evaluados", counts.evaluados],
            ["Pendientes", counts.pendientes],
            ["No aplicables", counts.noAplicables],
            ["Implementados", counts.implementados],
            ["Parcialmente implementados", counts.parcialmenteImplementados],
            ["No implementados", counts.noImplementados],
            ["Evidencias", counts.evidencias],
            ["Hallazgos", counts.hallazgos],
            ["Recomendaciones", counts.recomendaciones],
            ["Hallazgos sin recomendación", counts.hallazgosSinRecomendacion],
          ].map(([etiqueta, valor]) => (
            <div key={String(etiqueta)} className="rounded-lg bg-slate-50 p-3">
              <p className="text-xs text-slate-500">{etiqueta}</p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-slate-900">{valor}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 rounded-lg border border-slate-200 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Indicadores</p>
          <p className="mt-2">Implementados: {formatPercent(indicators.implementados)}</p>
          <p>Parcialmente implementados: {formatPercent(indicators.parcialmenteImplementados)}</p>
          <p>No implementados: {formatPercent(indicators.noImplementados)}</p>
          <p>Denominador: {indicators.denominador}</p>
        </div>

        <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <p className="font-semibold text-slate-900">Fórmula</p>
          <p className="mt-1">{indicators.formula}</p>
        </div>

        <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-amber-900">
          <p className="font-semibold">Limitaciones</p>
          <ul className="mt-1 list-disc space-y-1 pl-5">
            {limitaciones.map((limitacion) => (
              <li key={limitacion}>{limitacion}</li>
            ))}
          </ul>
        </div>

        {avisos.length ? (
          <div className="mt-4 rounded-lg border border-slate-200 p-3">
            <p className="font-semibold text-slate-900">Avisos</p>
            <ul className="mt-1 list-disc space-y-1 pl-5">
              {avisos.map((aviso) => (
                <li key={aviso}>{aviso}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </Seccion>

      <Seccion titulo="Distribución de resultados">
        <div className="space-y-4">
          <div>
            <h3 className="mb-1 font-semibold">Por estado de control</h3>
            <TablaSimple
              cabeceras={["Estado", "Total"]}
              filas={resultados.porEstado.map((item) => [statusLabel(item.status), String(item.total)])}
            />
          </div>
          <div>
            <h3 className="mb-1 font-semibold">Por tema</h3>
            <TablaSimple
              cabeceras={["Tema", "Evaluados", "Cumplimiento"]}
              filas={resultados.porTema.map((item) => [
                statusLabel(item.theme),
                String(item.evaluados),
                formatPercent(item.cumplimiento),
              ])}
            />
          </div>
          <div>
            <h3 className="mb-1 font-semibold">Por severidad de hallazgos</h3>
            <TablaSimple
              cabeceras={["Severidad", "Total"]}
              filas={resultados.porSeveridad.map((item) => [
                statusLabel(item.severity),
                String(item.total),
              ])}
            />
          </div>
        </div>
      </Seccion>

      <Seccion titulo="Detalle por control">
        {resultados.detallePorControl.length ? (
          <div className="space-y-3">
            {resultados.detallePorControl.map((detalle) => (
              <div
                key={detalle.auditControl.id}
                className="break-inside-avoid-page rounded-lg border border-slate-200 p-3"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-slate-900">{detalle.auditControl.control.code}</span>
                  <span className="font-medium text-slate-800">{detalle.auditControl.control.name}</span>
                  <ToneBadge tone={tonoControl(detalle.auditControl.status)}>
                    {statusLabel(detalle.auditControl.status)}
                  </ToneBadge>
                  {detalle.auditControl.maxSeverity ? (
                    <ToneBadge tone={tonoSeveridad(detalle.auditControl.maxSeverity)}>
                      Severidad máxima: {statusLabel(detalle.auditControl.maxSeverity)}
                    </ToneBadge>
                  ) : null}
                </div>
                {detalle.auditControl.observations ? (
                  <p className="mt-2 whitespace-pre-line break-words">
                    Observaciones: {detalle.auditControl.observations}
                  </p>
                ) : null}
                {detalle.auditControl.na_justification ? (
                  <p className="mt-1 break-words">
                    Justificación de no aplicabilidad: {detalle.auditControl.na_justification}
                  </p>
                ) : null}
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Evidencias</p>
                    {detalle.evidencias.length ? (
                      <ul className="mt-1 list-disc space-y-1 pl-5">
                        {detalle.evidencias.map((evidencia) => (
                          <li key={evidencia.id} className="break-words">
                            {evidencia.description} · {evidencia.reference} · {formatDate(evidencia.evidence_date)}
                            {evidencia.is_simulated ? " · Simulada" : " · No simulada"}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-1 text-slate-500">Sin evidencias registradas.</p>
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Hallazgos</p>
                    {detalle.hallazgos.length ? (
                      <ul className="mt-1 space-y-2">
                        {detalle.hallazgos.map((hallazgo) => (
                          <li key={hallazgo.id} className="break-words">
                            <span className="font-medium">{statusLabel(hallazgo.severity)}:</span>{" "}
                            {hallazgo.condition}
                            <div className="mt-1 pl-3 text-xs text-slate-600">
                              Criterio: {hallazgo.criterion} · Causa: {hallazgo.cause} · Efecto o riesgo:{" "}
                              {hallazgo.effect_risk}
                            </div>
                            <div className="mt-1 pl-3">
                              {hallazgo.recommendations.length ? (
                                <ul className="list-disc space-y-1 pl-4">
                                  {hallazgo.recommendations.map((recomendacion) => (
                                    <li key={recomendacion.id}>
                                      {recomendacion.description} (prioridad:{" "}
                                      {ETIQUETA_PRIORIDAD[recomendacion.priority]})
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <p className="font-medium text-amber-900">Sin recomendación asociada</p>
                              )}
                            </div>
                            {hallazgo.warningSinRecomendacion ? (
                              <p className="mt-1 pl-3 font-medium text-amber-900">Sin recomendación asociada</p>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-1 text-slate-500">Sin hallazgos registrados.</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p>No hay detalle por control disponible.</p>
        )}
      </Seccion>

      <Seccion titulo="Matriz de trazabilidad">
        <TablaSimple
          cabeceras={["Control", "Evidencias", "Hallazgos", "Recomendaciones"]}
          filas={resultados.trazabilidad.map((item) => [
            <span key={`c-${item.control.id}`}>
              {item.control.code} — {item.control.name}
              <span className="block text-xs text-slate-500">{statusLabel(item.status)}</span>
            </span>,
            item.evidencias.length ? (
              <ul key={`e-${item.control.id}`} className="list-disc pl-4">
                {item.evidencias.map((evidencia) => (
                  <li key={evidencia.id}>
                    {evidencia.reference}: {evidencia.descripcion}
                    {evidencia.simulada ? " (Simulada)" : ""}
                  </li>
                ))}
              </ul>
            ) : (
              "Sin evidencias"
            ),
            item.hallazgos.length ? (
              <ul key={`h-${item.control.id}`} className="list-disc pl-4">
                {item.hallazgos.map((hallazgo) => (
                  <li key={hallazgo.id}>
                    {statusLabel(hallazgo.severity)}: {hallazgo.condition}
                  </li>
                ))}
              </ul>
            ) : (
              "Sin hallazgos"
            ),
            item.recomendaciones.length ? (
              <ul key={`r-${item.control.id}`} className="list-disc pl-4">
                {item.recomendaciones.map((recomendacion) => (
                  <li key={recomendacion.id}>
                    {recomendacion.description} (prioridad: {ETIQUETA_PRIORIDAD[recomendacion.priority]})
                  </li>
                ))}
              </ul>
            ) : (
              "Sin recomendaciones"
            ),
          ])}
        />
      </Seccion>

      <Seccion titulo="Anexo de evidencias">
        {anexoEvidencias.length ? (
          <TablaSimple
            cabeceras={["Control", "Referencia", "Descripción", "Fuente", "Fecha", "Etiqueta"]}
            filas={anexoEvidencias.map((evidencia) => [
              <span key={`ac-${evidencia.id}`}>
                {evidencia.controlCode} — {evidencia.controlName}
              </span>,
              evidencia.reference,
              evidencia.description,
              evidencia.source,
              formatDate(evidencia.evidence_date),
              evidencia.etiquetaSimulada ? (
                <ToneBadge key={`sim-${evidencia.id}`} tone="warning">
                  {evidencia.etiquetaSimulada}
                </ToneBadge>
              ) : (
                "No simulada"
              ),
            ])}
          />
        ) : (
          <p>No hay evidencias registradas.</p>
        )}
      </Seccion>
    </article>
  );
}

export default ReportView;

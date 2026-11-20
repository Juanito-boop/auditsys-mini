/** Detalle de auditoría: cabecera, estado, configuración y pestañas de trabajo. */

"use client";

import { useParams, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { AuditForm, type AuditoriaFormData } from "@/components/audits/AuditForm";
import { EvaluationPanel } from "@/components/audits/evaluations/EvaluationPanel";
import { EvidencePanel } from "@/components/audits/evidences/EvidencePanel";
import { FindingPanel } from "@/components/audits/findings/FindingPanel";
import { ResultsPanel } from "@/components/audits/results/ResultsPanel";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ErrorState } from "@/components/ui/ErrorState";
import { Loading } from "@/components/ui/Loading";
import { SelectField } from "@/components/ui/FormControls";
import { Toast } from "@/components/ui/Toast";
import { ToneBadge, tonoAuditoria } from "@/components/ui/ToneBadge";
import { apiPatch, apiPut } from "@/lib/api-client";
import { useApiResource } from "@/lib/use-api";
import {
  AUDIT_STATUS_LABELS,
} from "@/shared/constants";
import { ESTADOS_AUDITORIA, formatDate, mensajeError, statusLabel, type Aviso } from "@/lib/ui";
import type { AuditDTO, AuditDetailDTO, AuditStatus, UserDTO } from "@/shared/types";

type Pestana = "configuracion" | "evaluaciones" | "evidencias" | "hallazgos" | "resultados";

const PESTANAS: Array<{ key: Pestana; label: string }> = [
  { key: "configuracion", label: "Configuración" },
  { key: "evaluaciones", label: "Controles y evaluación" },
  { key: "evidencias", label: "Evidencias" },
  { key: "hallazgos", label: "Hallazgos y recomendaciones" },
  { key: "resultados", label: "Resultados e informe" },
];

function esPestana(valor: string): valor is Pestana {
  return PESTANAS.some((pestana) => pestana.key === valor);
}

function idDeParametro(valor: string | string[] | undefined): string {
  if (Array.isArray(valor)) return valor[0] ?? "";
  return valor ?? "";
}

/** Sincroniza la pestaña con la query (?tab=…) tras navegaciones del cliente. */
function SincronizarPestana({ alCambiar }: { alCambiar: (pestana: Pestana) => void }) {
  const parametros = useSearchParams();
  const valor = parametros.get("tab");

  useEffect(() => {
    if (valor && esPestana(valor)) alCambiar(valor);
  }, [valor, alCambiar]);

  return null;
}

export default function AuditoriaDetallePage() {
  const parametros = useParams();
  const id = Number(idDeParametro(parametros.id));
  const [pestana, setPestana] = useState<Pestana>("configuracion");
  const [aviso, setAviso] = useState<Aviso | null>(null);
  const [confirmarCierre, setConfirmarCierre] = useState(false);
  const [cerrando, setCerrando] = useState(false);
  const [errorEstado, setErrorEstado] = useState<string | null>(null);

  const usuario = useApiResource<UserDTO>("/api/auth/me");
  const auditoria = useApiResource<AuditDetailDTO>(id > 0 ? `/api/audits/${id}` : null);

  const cambiarPestana = (nueva: Pestana) => {
    setPestana(nueva);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", nueva);
    window.history.replaceState(null, "", `${url.pathname}${url.search}`);
  };

  const guardarConfiguracion = async (datos: AuditoriaFormData) => {
    if (!auditoria.data) return;
    try {
      const actualizado = await apiPut<AuditDTO>(`/api/audits/${id}`, {
        organization: datos.organization,
        objective: datos.objective,
        scope: datos.scope,
        audit_date: datos.audit_date,
      });
      auditoria.setData((previo) => (previo ? { ...previo, ...actualizado } : previo));
      setAviso({ mensaje: "Auditoría actualizada correctamente.", tone: "success" });
    } catch (error) {
      setAviso({ mensaje: mensajeError(error), tone: "error" });
      throw error;
    }
  };

  const cambiarEstado = async (destino: AuditStatus) => {
    setErrorEstado(null);
    if (!auditoria.data || destino === auditoria.data.status) return;
    if (destino === "cerrada") {
      setConfirmarCierre(true);
      return;
    }
    try {
      await apiPatch<AuditDTO>(`/api/audits/${id}/status`, { status: destino });
      auditoria.setData((previo) => (previo ? { ...previo, status: destino } : previo));
      setAviso({ mensaje: `Estado actualizado a ${statusLabel(destino)}.`, tone: "success" });
    } catch (error) {
      setErrorEstado(mensajeError(error));
      setAviso({ mensaje: mensajeError(error), tone: "error" });
    }
  };

  const cerrarAuditoria = async () => {
    setCerrando(true);
    setErrorEstado(null);
    try {
      await apiPatch<AuditDTO>(`/api/audits/${id}/status`, { status: "cerrada" });
      auditoria.setData((previo) => (previo ? { ...previo, status: "cerrada" } : previo));
      setConfirmarCierre(false);
      setAviso({ mensaje: "Auditoría cerrada correctamente.", tone: "success" });
    } catch (error) {
      setConfirmarCierre(false);
      setErrorEstado(mensajeError(error));
      setAviso({ mensaje: mensajeError(error), tone: "error" });
    } finally {
      setCerrando(false);
    }
  };

  if (!Number.isFinite(id) || id <= 0) {
    return <ErrorState title="Auditoría no válida" message="El identificador de la auditoría no es válido." />;
  }

  if (usuario.loading || auditoria.loading) return <Loading label="Cargando la auditoría…" />;

  if (usuario.error) {
    return (
      <div className="mx-auto max-w-xl">
        <ErrorState
          title="No se pudo cargar tu información"
          message={usuario.error}
          onRetry={usuario.reload}
        />
      </div>
    );
  }

  if (auditoria.error) {
    return (
      <div className="mx-auto max-w-xl">
        <ErrorState
          title="No se pudo cargar la auditoría"
          message={auditoria.error}
          onRetry={auditoria.reload}
        />
      </div>
    );
  }

  if (!usuario.data || !auditoria.data) return <Loading label="Cargando la auditoría…" />;

  const detalle = auditoria.data;
  const esAdmin = usuario.data.role === "admin";
  const soloLectura = detalle.status === "cerrada";
  const porcentaje = detalle.progress.total
    ? Math.round((detalle.progress.evaluados / detalle.progress.total) * 100)
    : 0;

  return (
    <div className="space-y-6">
      <Suspense fallback={null}>
        <SincronizarPestana alCambiar={setPestana} />
      </Suspense>

      <Card className="print-hidden p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="break-words text-2xl font-semibold tracking-tight text-slate-900">
                {detalle.organization}
              </h1>
              <ToneBadge tone={tonoAuditoria(detalle.status)}>{statusLabel(detalle.status)}</ToneBadge>
            </div>
            <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-slate-700">{detalle.objective}</p>
          </div>
          <div className="flex flex-col gap-2 sm:shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const url = new URL(window.location.href);
                url.searchParams.set("tab", "resultados");
                window.history.replaceState(null, "", `${url.pathname}${url.search}`);
                setPestana("resultados");
              }}
              className="print-hidden"
            >
              Ver resultados e informe
            </Button>
          </div>
        </div>

        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Alcance</dt>
            <dd className="mt-1 whitespace-pre-line break-words text-slate-800">{detalle.scope}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Fecha</dt>
            <dd className="mt-1 text-slate-800">{formatDate(detalle.audit_date)}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Auditor</dt>
            <dd className="mt-1 break-words text-slate-800">{detalle.auditor_name}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Registro</dt>
            <dd className="mt-1 text-slate-800">{formatDate(detalle.created_at)}</dd>
          </div>
        </dl>

        <div className="mt-4">
          <div className="flex items-center justify-between gap-2 text-sm text-slate-600">
            <span>
              {detalle.progress.evaluados} de {detalle.progress.total} controles evaluados
            </span>
            <span className="tabular-nums">{porcentaje} %</span>
          </div>
          <div
            role="progressbar"
            aria-label="Controles evaluados"
            aria-valuemin={0}
            aria-valuemax={detalle.progress.total}
            aria-valuenow={detalle.progress.evaluados}
            className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-100"
          >
            <div className="h-full rounded-full bg-slate-700" style={{ width: `${porcentaje}%` }} />
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {detalle.progress.pendientes} pendientes · {detalle.totalEvidencias} evidencias ·{" "}
            {detalle.totalHallazgos} hallazgos
          </p>
        </div>
      </Card>

      <div role="tablist" aria-label="Secciones de la auditoría" className="print-hidden flex flex-wrap gap-2">
        {PESTANAS.map((pestanaItem) => (
          <button
            key={pestanaItem.key}
            type="button"
            role="tab"
            aria-selected={pestana === pestanaItem.key}
            aria-controls="panel-auditoria"
            onClick={() => cambiarPestana(pestanaItem.key)}
            className={
              pestana === pestanaItem.key
                ? "rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white"
                : "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            }
          >
            {pestanaItem.label}
          </button>
        ))}
      </div>

      <div id="panel-auditoria" role="tabpanel" aria-live="polite">
        {pestana === "configuracion" ? (
          <div className="space-y-4">
            {soloLectura ? (
              <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                Auditoría cerrada: solo lectura. No se pueden editar sus datos ni cambiar el estado.
              </p>
            ) : null}
            <Card className="p-4 sm:p-5">
              <h2 className="text-base font-semibold text-slate-900">Datos de la auditoría</h2>
              <div className="mt-4">
                <AuditForm
                  initial={detalle}
                  esAdmin={esAdmin}
                  soloLectura={soloLectura}
                  onSubmit={guardarConfiguracion}
                />
              </div>
            </Card>

            <Card className="p-4 sm:p-5">
              <h2 className="text-base font-semibold text-slate-900">Estado de la auditoría</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2 sm:items-end">
                <SelectField
                  id="estado-auditoria"
                  label="Estado"
                  value={detalle.status}
                  onChange={(valor) => void cambiarEstado(valor as AuditStatus)}
                  disabled={soloLectura || cerrando}
                  options={ESTADOS_AUDITORIA.map((estado) => ({
                    value: estado,
                    label: AUDIT_STATUS_LABELS[estado],
                  }))}
                />
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="danger"
                    disabled={soloLectura}
                    onClick={() => setConfirmarCierre(true)}
                  >
                    Cerrar auditoría
                  </Button>
                </div>
              </div>
              {errorEstado ? (
                <p role="alert" className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                  {errorEstado}
                </p>
              ) : null}
            </Card>
          </div>
        ) : null}

        {pestana === "evaluaciones" ? (
          <EvaluationPanel
            auditId={id}
            soloLectura={soloLectura}
            onAviso={setAviso}
            onActualizado={auditoria.reload}
          />
        ) : null}

        {pestana === "evidencias" ? (
          <EvidencePanel
            auditId={id}
            controles={detalle.controls}
            soloLectura={soloLectura}
            onAviso={setAviso}
            onActualizado={auditoria.reload}
          />
        ) : null}

        {pestana === "hallazgos" ? (
          <FindingPanel
            auditId={id}
            organizacion={detalle.organization}
            controles={detalle.controls}
            soloLectura={soloLectura}
            onAviso={setAviso}
            onActualizado={auditoria.reload}
          />
        ) : null}

        {pestana === "resultados" ? <ResultsPanel auditId={id} /> : null}
      </div>

      <ConfirmDialog
        open={confirmarCierre}
        title="Cerrar auditoría"
        message="¿Seguro que quieres cerrar la auditoría? Después no podrás editar su configuración, evaluaciones, evidencias ni hallazgos."
        confirmLabel="Cerrar auditoría"
        onConfirm={() => void cerrarAuditoria()}
        onCancel={() => setConfirmarCierre(false)}
      />

      {aviso ? <Toast message={aviso.mensaje} tone={aviso.tone} onClose={() => setAviso(null)} /> : null}
    </div>
  );
}

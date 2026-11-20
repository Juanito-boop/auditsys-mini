/** Panel de evaluación de controles: estados, observaciones y justificación. */

"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ErrorState } from "@/components/ui/ErrorState";
import { Loading } from "@/components/ui/Loading";
import { SelectField, TextAreaField } from "@/components/ui/FormControls";
import { ToneBadge, tonoControl, tonoSeveridad } from "@/components/ui/ToneBadge";
import { apiPut } from "@/lib/api-client";
import { useApiResource } from "@/lib/use-api";
import {
  erroresServidor,
  ESTADOS_CONTROL,
  mensajeError,
  statusLabel,
  type Aviso,
} from "@/lib/ui";
import { evaluacionEsquema, validarCon } from "@/lib/validation";
import { CONTROL_STATUS_LABELS, SEVERITY_LABELS } from "@/shared/constants";
import type { AuditControlDTO, ControlStatus } from "@/shared/types";

interface Borrador {
  status: ControlStatus;
  observations: string;
  na_justification: string;
}

type MapaBorradores = Record<number, Borrador>;

interface EvaluationPanelProps {
  auditId: number;
  soloLectura: boolean;
  onAviso: (aviso: Aviso) => void;
  onActualizado?: () => void;
}

function borradorDe(fila: AuditControlDTO): Borrador {
  return {
    status: fila.status,
    observations: fila.observations,
    na_justification: fila.na_justification ?? "",
  };
}

export function EvaluationPanel({
  auditId,
  soloLectura,
  onAviso,
  onActualizado,
}: EvaluationPanelProps) {
  const recurso = useApiResource<AuditControlDTO[]>(`/api/audits/${auditId}/evaluations`);
  const [filtro, setFiltro] = useState<ControlStatus | "todos">("todos");
  const [cambios, setCambios] = useState<MapaBorradores>({});
  const [guardando, setGuardando] = useState<Record<number, boolean>>({});
  const [errores, setErrores] = useState<Record<number, string>>({});
  const [guardado, setGuardado] = useState<Record<number, boolean>>({});

  /** Solo guarda lo que el usuario ha tocado; el resto se deriva del recurso. */
  const borradorDeFila = (fila: AuditControlDTO): Borrador =>
    cambios[fila.id] ?? borradorDe(fila);

  const filas = (recurso.data ?? []).filter(
    (fila) => filtro === "todos" || fila.status === filtro,
  );

  const guardar = async (fila: AuditControlDTO, borrador?: Borrador) => {
    const valoresBorrador = borrador ?? borradorDeFila(fila);
    const { valores, errores: erroresLocales } = validarCon(evaluacionEsquema, valoresBorrador);

    if (!valores) {
      const mensaje = erroresLocales.na_justification ?? Object.values(erroresLocales)[0] ?? "Revisa los datos.";
      setErrores((previo) => ({ ...previo, [fila.id]: mensaje }));
      setGuardado((previo) => ({ ...previo, [fila.id]: false }));
      return;
    }

    setGuardando((previo) => ({ ...previo, [fila.id]: true }));
    setErrores((previo) => ({ ...previo, [fila.id]: "" }));
    setGuardado((previo) => ({ ...previo, [fila.id]: false }));

    try {
      const actualizado = await apiPut<AuditControlDTO>(
        `/api/audits/${auditId}/evaluations/${fila.control_id}`,
        {
          status: valores.status,
          observations: valores.observations,
          na_justification: valores.na_justification,
        },
      );
      recurso.setData((previo) =>
        previo?.map((item) => (item.id === actualizado.id ? { ...item, ...actualizado } : item)) ??
        previo,
      );
      setCambios((previo) => {
        const resto = { ...previo };
        delete resto[fila.id];
        return resto;
      });
      setGuardado((previo) => ({ ...previo, [fila.id]: true }));
      onAviso({ mensaje: `Evaluación del control ${fila.control.code} guardada.`, tone: "success" });
      onActualizado?.();
    } catch (error) {
      const mensaje = mensajeError(error);
      setErrores((previo) => ({ ...previo, [fila.id]: mensaje }));
      const porCampo = erroresServidor(error, ["status", "observations", "na_justification"]);
      if (porCampo.na_justification) {
        setErrores((previo) => ({ ...previo, [fila.id]: porCampo.na_justification }));
      }
      onAviso({ mensaje, tone: "error" });
    } finally {
      setGuardando((previo) => ({ ...previo, [fila.id]: false }));
    }
  };

  const cambiarDraft = (fila: AuditControlDTO, campo: keyof Borrador, valor: string) => {
    setCambios((previo) => ({
      ...previo,
      [fila.id]: { ...borradorDeFila(fila), [campo]: valor },
    }));
    setGuardado((previo) => ({ ...previo, [fila.id]: false }));
    setErrores((previo) => ({ ...previo, [fila.id]: "" }));
  };

  const cambiarEstado = (fila: AuditControlDTO, estado: string) => {
    const siguiente: Borrador = {
      ...borradorDeFila(fila),
      status: estado as ControlStatus,
    };
    cambiarDraft(fila, "status", estado);
    void guardar(fila, siguiente);
  };

  if (recurso.loading) return <Loading label="Cargando evaluaciones…" />;

  if (recurso.error) {
    return (
      <ErrorState
        title="No se pudieron cargar las evaluaciones"
        message={recurso.error}
        onRetry={recurso.reload}
      />
    );
  }

  if (!recurso.data) return <Loading label="Cargando evaluaciones…" />;

  return (
    <div className="space-y-4">
      {soloLectura ? (
        <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
          Auditoría cerrada: solo lectura. No se puede modificar la evaluación.
        </p>
      ) : null}

      <Card className="p-4 sm:p-5">
        <div className="sm:max-w-xs">
          <SelectField
            id="filtro-evaluacion"
            label="Filtrar por estado"
            value={filtro}
            onChange={(valor) => setFiltro(valor as ControlStatus | "todos")}
            options={[
              { value: "todos", label: "Todos" },
              ...ESTADOS_CONTROL.map((estado) => ({
                value: estado,
                label: CONTROL_STATUS_LABELS[estado],
              })),
            ]}
          />
        </div>
      </Card>

      {filas.length === 0 ? (
        <Card className="p-6 sm:p-8">
          <h3 className="text-base font-semibold text-slate-900">No hay controles en este estado</h3>
          <p className="mt-1 text-sm text-slate-600">Prueba con otro filtro.</p>
        </Card>
      ) : null}

      {filas.map((fila) => {
        const borrador = borradorDeFila(fila);
        const ocupado = Boolean(guardando[fila.id]);
        const mensajeErrorFila = errores[fila.id];
        return (
          <Card key={fila.id} className="min-w-0 p-4 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold tabular-nums text-slate-900">{fila.control.code}</span>
                  <span className="break-words font-medium text-slate-800">{fila.control.name}</span>
                  <ToneBadge tone={tonoControl(fila.status)}>{statusLabel(fila.status)}</ToneBadge>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{fila.control.criterion}</p>
              </div>
              <div className="flex flex-wrap gap-2 text-xs text-slate-600 sm:shrink-0">
                <span className="rounded-md bg-slate-100 px-2 py-1">
                  {fila.evidenciaCount} evidencia{fila.evidenciaCount === 1 ? "" : "s"}
                </span>
                <span className="rounded-md bg-slate-100 px-2 py-1">
                  {fila.hallazgoCount} hallazgo{fila.hallazgoCount === 1 ? "" : "s"}
                </span>
                {fila.maxSeverity ? (
                  <ToneBadge tone={tonoSeveridad(fila.maxSeverity)}>
                    Severidad máxima: {SEVERITY_LABELS[fila.maxSeverity]}
                  </ToneBadge>
                ) : null}
              </div>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <SelectField
                id={`estado-${fila.id}`}
                label="Estado de la evaluación"
                value={borrador.status}
                onChange={(valor) => cambiarEstado(fila, valor)}
                disabled={soloLectura || ocupado}
                options={ESTADOS_CONTROL.map((estado) => ({
                  value: estado,
                  label: CONTROL_STATUS_LABELS[estado],
                }))}
                hint="Al cambiar el estado se guarda junto a las observaciones actuales."
              />
              <TextAreaField
                id={`observaciones-${fila.id}`}
                label="Observaciones"
                value={borrador.observations}
                onChange={(valor) => cambiarDraft(fila, "observations", valor)}
                disabled={soloLectura || ocupado}
                rows={3}
                maxLength={2000}
              />
            </div>

            {borrador.status === "no_aplicable" ? (
              <div className="mt-4">
                <TextAreaField
                  id={`justificacion-${fila.id}`}
                  label="Justificación de no aplicabilidad"
                  value={borrador.na_justification}
                  onChange={(valor) => cambiarDraft(fila, "na_justification", valor)}
                  disabled={soloLectura || ocupado}
                  rows={2}
                  maxLength={2000}
                  error={mensajeErrorFila?.includes("justificación") ? mensajeErrorFila : undefined}
                  hint="Obligatoria cuando el control se marca como no aplicable."
                />
              </div>
            ) : null}

            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 text-sm">
                {ocupado ? <span className="text-slate-600">Guardando…</span> : null}
                {!ocupado && guardado[fila.id] ? (
                  <span role="status" className="text-emerald-700">Cambios guardados.</span>
                ) : null}
                {!ocupado && mensajeErrorFila ? (
                  <p role="alert" className="break-words text-red-700">{mensajeErrorFila}</p>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2">
                <Link
                  href={`/audits/${auditId}?tab=evidencias`}
                  className="inline-flex h-9 items-center rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-800 hover:bg-slate-50"
                >
                  Evidencias
                </Link>
                <Link
                  href={`/audits/${auditId}?tab=hallazgos`}
                  className="inline-flex h-9 items-center rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-800 hover:bg-slate-50"
                >
                  Hallazgos
                </Link>
                {!soloLectura ? (
                  <Button
                    size="sm"
                    loading={ocupado}
                    onClick={() => void guardar(fila)}
                  >
                    Guardar observaciones
                  </Button>
                ) : null}
              </div>
            </div>
          </Card>
        );
      })}

    </div>
  );
}

export default EvaluationPanel;

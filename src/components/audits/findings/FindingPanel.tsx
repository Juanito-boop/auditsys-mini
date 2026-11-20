/** Panel de hallazgos y recomendaciones, con trazabilidad y edición en línea. */

"use client";

import Link from "next/link";
import { useState } from "react";
import type { FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ErrorState } from "@/components/ui/ErrorState";
import { SelectField, TextAreaField } from "@/components/ui/FormControls";
import { Loading } from "@/components/ui/Loading";
import { ToneBadge, tonoPrioridad, tonoSeveridad } from "@/components/ui/ToneBadge";
import { apiDelete, apiPost, apiPut } from "@/lib/api-client";
import { useApiResource } from "@/lib/use-api";
import {
  erroresServidor,
  mensajeError,
  PRIORIDADES,
  SEVERIDADES,
  statusLabel,
  type Aviso,
} from "@/lib/ui";
import {
  hallazgoEsquema,
  recomendacionEsquema,
  validarCon,
} from "@/lib/validation";
import { SEVERITY_LABELS } from "@/shared/constants";
import type {
  AuditControlDTO,
  FindingDTO,
  Priority,
  RecommendationDTO,
  Severity,
} from "@/shared/types";

type Errores = Record<string, string>;

const ETIQUETA_PRIORIDAD: Record<Priority, string> = {
  baja: "Baja",
  media: "Media",
  alta: "Alta",
};

export interface HallazgoFormData {
  audit_control_id: number;
  condition: string;
  criterion: string;
  cause: string;
  effect_risk: string;
  severity: Severity;
}

interface HallazgoFormProps {
  controles: AuditControlDTO[];
  initial?: FindingDTO | null;
  onSubmit: (datos: HallazgoFormData) => Promise<void>;
  onCancel: () => void;
}

function HallazgoForm({ controles, initial, onSubmit, onCancel }: HallazgoFormProps) {
  const [auditControlId, setAuditControlId] = useState(String(initial?.audit_control_id ?? ""));
  const [condition, setCondition] = useState(initial?.condition ?? "");
  const [criterion, setCriterio] = useState(initial?.criterion ?? "");
  const [cause, setCause] = useState(initial?.cause ?? "");
  const [effectRisk, setEffectRisk] = useState(initial?.effect_risk ?? "");
  const [severity, setSeverity] = useState<Severity>(initial?.severity ?? "media");
  const [errores, setErrores] = useState<Errores>({});
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const opciones = controles.map((item) => ({
    value: String(item.id),
    label: `${item.control.code} — ${item.control.name}`,
  }));
  if (initial && !opciones.some((opcion) => opcion.value === String(initial.audit_control_id))) {
    opciones.push({
      value: String(initial.audit_control_id),
      label: `${initial.control.code} — ${initial.control.name} (estado anterior)`,
    });
  }

  const enviar = async (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    setErrorGeneral(null);
    const { valores, errores: erroresLocales } = validarCon(hallazgoEsquema, {
      audit_control_id: auditControlId,
      condition,
      criterion,
      cause,
      effect_risk: effectRisk,
      severity,
    });
    setErrores(erroresLocales);
    if (!valores) {
      const primero = Object.keys(erroresLocales)[0];
      if (primero) document.getElementById(`hallazgo-${primero}`)?.focus();
      return;
    }

    setEnviando(true);
    try {
      await onSubmit(valores);
    } catch (error) {
      setErrores(
        erroresServidor(error, [
          "audit_control_id",
          "condition",
          "criterion",
          "cause",
          "effect_risk",
          "severity",
        ]),
      );
      setErrorGeneral(mensajeError(error));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <form onSubmit={enviar} noValidate className="space-y-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
      <SelectField
        id="hallazgo-audit_control_id"
        label="Control asociado"
        value={auditControlId}
        onChange={setAuditControlId}
        error={errores.audit_control_id}
        disabled={enviando}
        options={[{ value: "", label: "Selecciona un control" }, ...opciones]}
        hint="Se muestran controles parcialmente implementados o no implementados."
      />
      <TextAreaField
        id="hallazgo-condition"
        label="Condición"
        value={condition}
        onChange={setCondition}
        error={errores.condition}
        disabled={enviando}
        rows={3}
        maxLength={1000}
        placeholder="Qué se observó durante la auditoría"
      />
      <TextAreaField
        id="hallazgo-criterion"
        label="Criterio"
        value={criterion}
        onChange={setCriterio}
        error={errores.criterion}
        disabled={enviando}
        rows={3}
        maxLength={1000}
        placeholder="Qué se esperaba según el control"
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextAreaField
          id="hallazgo-cause"
          label="Causa"
          value={cause}
          onChange={setCause}
          error={errores.cause}
          disabled={enviando}
          rows={3}
          maxLength={1000}
        />
        <TextAreaField
          id="hallazgo-effect_risk"
          label="Efecto o riesgo"
          value={effectRisk}
          onChange={setEffectRisk}
          error={errores.effect_risk}
          disabled={enviando}
          rows={3}
          maxLength={1000}
        />
      </div>
      <SelectField
        id="hallazgo-severity"
        label="Severidad"
        value={severity}
        onChange={(valor) => setSeverity(valor as Severity)}
        error={errores.severity}
        disabled={enviando}
        options={SEVERIDADES.map((valor) => ({
          value: valor,
          label: SEVERITY_LABELS[valor],
        }))}
      />
      {errorGeneral ? (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {errorGeneral}
        </p>
      ) : null}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onCancel} disabled={enviando}>
          Cancelar
        </Button>
        <Button type="submit" loading={enviando}>
          {enviando ? "Guardando…" : initial ? "Guardar hallazgo" : "Registrar hallazgo"}
        </Button>
      </div>
    </form>
  );
}

interface RecomendacionesProps {
  findingId: number;
  recomendaciones: RecommendationDTO[];
  soloLectura: boolean;
  onAviso: (aviso: Aviso) => void;
  onActualizado?: () => void;
}

function Recomendaciones({
  findingId,
  recomendaciones,
  soloLectura,
  onAviso,
  onActualizado,
}: RecomendacionesProps) {
  const [agregando, setAgregando] = useState(false);
  const [nuevaDescripcion, setNuevaDescripcion] = useState("");
  const [nuevaPrioridad, setNuevaPrioridad] = useState<Priority>("media");
  const [errores, setErrores] = useState<Errores>({});
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [editDescripcion, setEditDescripcion] = useState("");
  const [editPrioridad, setEditPrioridad] = useState<Priority>("media");
  const [aBorrar, setABorrar] = useState<RecommendationDTO | null>(null);

  const agregar = async (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    setErrorGeneral(null);
    const { valores, errores: erroresLocales } = validarCon(recomendacionEsquema, {
      description: nuevaDescripcion,
      priority: nuevaPrioridad,
    });
    setErrores(erroresLocales);
    if (!valores) return;

    setEnviando(true);
    try {
      await apiPost<RecommendationDTO>(`/api/findings/${findingId}/recommendations`, valores);
      setNuevaDescripcion("");
      setNuevaPrioridad("media");
      setAgregando(false);
      onAviso({ mensaje: "Recomendación añadida correctamente.", tone: "success" });
      onActualizado?.();
    } catch (error) {
      setErrores(erroresServidor(error, ["description", "priority"]));
      setErrorGeneral(mensajeError(error));
      onAviso({ mensaje: mensajeError(error), tone: "error" });
    } finally {
      setEnviando(false);
    }
  };

  const empezarEdicion = (recomendacion: RecommendationDTO) => {
    setEditandoId(recomendacion.id);
    setEditDescripcion(recomendacion.description);
    setEditPrioridad(recomendacion.priority);
    setErrores({});
    setErrorGeneral(null);
  };

  const guardarEdicion = async (recomendacion: RecommendationDTO) => {
    setErrorGeneral(null);
    const { valores, errores: erroresLocales } = validarCon(recomendacionEsquema, {
      description: editDescripcion,
      priority: editPrioridad,
    });
    setErrores(erroresLocales);
    if (!valores) return;

    setEnviando(true);
    try {
      await apiPut<RecommendationDTO>(`/api/recommendations/${recomendacion.id}`, valores);
      setEditandoId(null);
      onAviso({ mensaje: "Recomendación actualizada correctamente.", tone: "success" });
      onActualizado?.();
    } catch (error) {
      setErrores(erroresServidor(error, ["description", "priority"]));
      setErrorGeneral(mensajeError(error));
      onAviso({ mensaje: mensajeError(error), tone: "error" });
    } finally {
      setEnviando(false);
    }
  };

  const borrar = async () => {
    if (!aBorrar) return;
    try {
      await apiDelete(`/api/recommendations/${aBorrar.id}`);
      setABorrar(null);
      onAviso({ mensaje: "Recomendación eliminada correctamente.", tone: "success" });
      onActualizado?.();
    } catch (error) {
      onAviso({ mensaje: mensajeError(error), tone: "error" });
    }
  };

  return (
    <div className="mt-4 border-t border-slate-200 pt-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-sm font-semibold text-slate-800">Recomendaciones</h4>
        {!soloLectura ? (
          <Button size="sm" variant="secondary" onClick={() => setAgregando((valor) => !valor)}>
            {agregando ? "Cancelar" : "Añadir recomendación"}
          </Button>
        ) : null}
      </div>

      {agregando && !soloLectura ? (
        <form onSubmit={agregar} noValidate className="mt-3 space-y-3 rounded-lg bg-slate-50 p-3">
          <TextAreaField
            id={`recomendacion-nueva-${findingId}`}
            label="Descripción"
            value={nuevaDescripcion}
            onChange={setNuevaDescripcion}
            error={errores.description}
            disabled={enviando}
            rows={2}
            maxLength={1000}
          />
          <SelectField
            id={`recomendacion-prioridad-nueva-${findingId}`}
            label="Prioridad"
            value={nuevaPrioridad}
            onChange={(valor) => setNuevaPrioridad(valor as Priority)}
            error={errores.priority}
            disabled={enviando}
            options={PRIORIDADES.map((valor) => ({
              value: valor,
              label: ETIQUETA_PRIORIDAD[valor],
            }))}
          />
          {errorGeneral ? <p role="alert" className="text-sm text-red-700">{errorGeneral}</p> : null}
          <div className="flex justify-end">
            <Button type="submit" size="sm" loading={enviando}>
              Guardar recomendación
            </Button>
          </div>
        </form>
      ) : null}

      {!recomendaciones.length ? (
        <p className="mt-2 text-sm text-slate-600">Sin recomendación asociada.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {recomendaciones.map((recomendacion) => (
            <li key={recomendacion.id} className="rounded-lg border border-slate-200 bg-white p-3">
              {editandoId === recomendacion.id ? (
                <div className="space-y-3">
                  <TextAreaField
                    id={`recomendacion-editar-${recomendacion.id}`}
                    label="Descripción"
                    value={editDescripcion}
                    onChange={setEditDescripcion}
                    error={errores.description}
                    disabled={enviando}
                    rows={2}
                    maxLength={1000}
                  />
                  <SelectField
                    id={`recomendacion-prioridad-editar-${recomendacion.id}`}
                    label="Prioridad"
                    value={editPrioridad}
                    onChange={(valor) => setEditPrioridad(valor as Priority)}
                    error={errores.priority}
                    disabled={enviando}
                    options={PRIORIDADES.map((valor) => ({
                      value: valor,
                      label: ETIQUETA_PRIORIDAD[valor],
                    }))}
                  />
                  {errorGeneral ? <p role="alert" className="text-sm text-red-700">{errorGeneral}</p> : null}
                  <div className="flex flex-wrap justify-end gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setEditandoId(null)}
                      disabled={enviando}
                    >
                      Cancelar
                    </Button>
                    <Button size="sm" loading={enviando} onClick={() => void guardarEdicion(recomendacion)}>
                      Guardar
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="break-words text-sm text-slate-800">{recomendacion.description}</p>
                    <div className="mt-2">
                      <ToneBadge tone={tonoPrioridad(recomendacion.priority)}>
                        Prioridad: {ETIQUETA_PRIORIDAD[recomendacion.priority]}
                      </ToneBadge>
                    </div>
                  </div>
                  {!soloLectura ? (
                    <div className="flex shrink-0 gap-1">
                      <Button size="sm" variant="ghost" onClick={() => empezarEdicion(recomendacion)}>
                        Editar
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setABorrar(recomendacion)}
                      >
                        Eliminar
                      </Button>
                    </div>
                  ) : null}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={aBorrar !== null}
        title="Eliminar recomendación"
        message="¿Seguro que quieres eliminar esta recomendación? La acción no se puede deshacer."
        confirmLabel="Eliminar"
        destructive
        onConfirm={() => void borrar()}
        onCancel={() => setABorrar(null)}
      />
    </div>
  );
}

interface FindingPanelProps {
  auditId: number;
  organizacion?: string;
  controles: AuditControlDTO[];
  soloLectura: boolean;
  onAviso: (aviso: Aviso) => void;
  onActualizado?: () => void;
}

export function FindingPanel({
  auditId,
  organizacion,
  controles,
  soloLectura,
  onAviso,
  onActualizado,
}: FindingPanelProps) {
  const recurso = useApiResource<FindingDTO[]>(`/api/audits/${auditId}/findings`);
  const [creando, setCreando] = useState(false);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [aBorrar, setABorrar] = useState<FindingDTO | null>(null);
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);

  const controlesDisponibles = controles.filter(
    (item) => item.status === "parcialmente_implementado" || item.status === "no_implementado",
  );

  const crear = async (datos: HallazgoFormData) => {
    try {
      await apiPost<FindingDTO>(`/api/audits/${auditId}/findings`, datos);
      setCreando(false);
      setErrorGeneral(null);
      onAviso({ mensaje: "Hallazgo registrado correctamente.", tone: "success" });
      recurso.reload();
      onActualizado?.();
    } catch (error) {
      onAviso({ mensaje: mensajeError(error), tone: "error" });
      throw error;
    }
  };

  const editar = async (finding: FindingDTO, datos: HallazgoFormData) => {
    try {
      await apiPut<FindingDTO>(`/api/findings/${finding.id}`, datos);
      setEditandoId(null);
      setErrorGeneral(null);
      onAviso({ mensaje: "Hallazgo actualizado correctamente.", tone: "success" });
      recurso.reload();
      onActualizado?.();
    } catch (error) {
      onAviso({ mensaje: mensajeError(error), tone: "error" });
      throw error;
    }
  };

  const borrar = async () => {
    if (!aBorrar) return;
    try {
      await apiDelete(`/api/findings/${aBorrar.id}`);
      setABorrar(null);
      onAviso({ mensaje: "Hallazgo eliminado correctamente.", tone: "success" });
      recurso.reload();
      onActualizado?.();
    } catch (error) {
      setErrorGeneral(mensajeError(error));
      onAviso({ mensaje: mensajeError(error), tone: "error" });
    }
  };

  if (recurso.loading) return <Loading label="Cargando hallazgos…" />;

  if (recurso.error) {
    return (
      <ErrorState
        title="No se pudieron cargar los hallazgos"
        message={recurso.error}
        onRetry={recurso.reload}
      />
    );
  }

  if (!recurso.data) return <Loading label="Cargando hallazgos…" />;

  return (
    <div className="space-y-4">
      {soloLectura ? (
        <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
          Auditoría cerrada: solo lectura. No se pueden crear, editar ni eliminar hallazgos.
        </p>
      ) : null}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-600">
          {recurso.data.length} hallazgo{recurso.data.length === 1 ? "" : "s"} registrado
          {recurso.data.length === 1 ? "" : "s"}.
        </p>
        {!soloLectura ? (
          <Button
            onClick={() => setCreando((valor) => !valor)}
            disabled={!controlesDisponibles.length}
          >
            {creando ? "Cancelar alta" : "Nuevo hallazgo"}
          </Button>
        ) : null}
      </div>

      {!controlesDisponibles.length && !soloLectura ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          No hay controles con estado parcialmente implementado o no implementado. Evalúa al menos un
          control antes de registrar hallazgos.
        </p>
      ) : null}

      {creando && !soloLectura && controlesDisponibles.length ? (
        <HallazgoForm
          controles={controlesDisponibles}
          onSubmit={crear}
          onCancel={() => setCreando(false)}
        />
      ) : null}

      {errorGeneral ? (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {errorGeneral}
        </p>
      ) : null}

      {!recurso.data.length ? (
        <Card className="p-6 sm:p-8">
          <h3 className="text-base font-semibold text-slate-900">Sin hallazgos</h3>
          <p className="mt-1 text-sm text-slate-600">
            Todavía no se han registrado hallazgos para esta auditoría.
          </p>
        </Card>
      ) : null}

      {recurso.data.map((finding) => (
        <Card key={finding.id} className="min-w-0 p-4 sm:p-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <ToneBadge tone={tonoSeveridad(finding.severity)}>
                  Severidad: {statusLabel(finding.severity)}
                </ToneBadge>
                <span className="text-sm font-medium text-slate-800">
                  {finding.control.code} — {finding.control.name}
                </span>
              </div>
              <p className="mt-2 text-xs text-slate-500">
                Auditoría #{auditId}
                {organizacion ? ` · ${organizacion}` : ""} ·{" "}
                <Link
                  href={`/audits/${auditId}?tab=hallazgos`}
                  className="font-medium text-slate-800 underline underline-offset-2"
                >
                  Ver trazabilidad en la auditoría
                </Link>{" "}
                ·{" "}
                <Link
                  href={`/audits/${auditId}?tab=evaluaciones`}
                  className="font-medium text-slate-800 underline underline-offset-2"
                >
                  Ver control evaluado
                </Link>
              </p>
            </div>
            {!soloLectura ? (
              <div className="flex shrink-0 gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setEditandoId(editandoId === finding.id ? null : finding.id);
                    setCreando(false);
                  }}
                >
                  {editandoId === finding.id ? "Cancelar edición" : "Editar"}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setABorrar(finding)}>
                  Eliminar
                </Button>
              </div>
            ) : null}
          </div>

          {editandoId === finding.id ? (
            <div className="mt-4">
              <HallazgoForm
                controles={controlesDisponibles}
                initial={finding}
                onSubmit={(datos) => editar(finding, datos)}
                onCancel={() => setEditandoId(null)}
              />
            </div>
          ) : (
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              {[
                ["Condición", finding.condition],
                ["Criterio", finding.criterion],
                ["Causa", finding.cause],
                ["Efecto o riesgo", finding.effect_risk],
              ].map(([etiqueta, valor]) => (
                <div key={etiqueta} className="min-w-0 rounded-lg bg-slate-50 p-3">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{etiqueta}</dt>
                  <dd className="mt-1 break-words leading-relaxed text-slate-800">{valor}</dd>
                </div>
              ))}
            </dl>
          )}

          {finding.warningSinRecomendacion ? (
            <p className="mt-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900">
              Sin recomendación asociada
            </p>
          ) : null}

          <Recomendaciones
            findingId={finding.id}
            recomendaciones={finding.recommendations}
            soloLectura={soloLectura}
            onAviso={onAviso}
            onActualizado={() => {
              recurso.reload();
              onActualizado?.();
            }}
          />
        </Card>
      ))}

      <ConfirmDialog
        open={aBorrar !== null}
        title="Eliminar hallazgo"
        message="¿Seguro que quieres eliminar este hallazgo? También se eliminarán sus recomendaciones."
        confirmLabel="Eliminar"
        destructive
        onConfirm={() => void borrar()}
        onCancel={() => setABorrar(null)}
      />
    </div>
  );
}

export default FindingPanel;

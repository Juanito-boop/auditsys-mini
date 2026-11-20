/** Panel de evidencias: alta, listado por control y borrado con confirmación. */

"use client";

import Link from "next/link";
import { useState } from "react";
import type { FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { CheckboxField, SelectField, TextAreaField } from "@/components/ui/FormControls";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ErrorState } from "@/components/ui/ErrorState";
import { Field } from "@/components/ui/Field";
import { Loading } from "@/components/ui/Loading";
import { ToneBadge, tonoControl } from "@/components/ui/ToneBadge";
import { apiDelete, apiPost } from "@/lib/api-client";
import { useApiResource } from "@/lib/use-api";
import {
  erroresServidor,
  mensajeError,
  statusLabel,
  type Aviso,
} from "@/lib/ui";
import { evidenciaEsquema, validarCon } from "@/lib/validation";
import type { AuditControlDTO, EvidenceDTO } from "@/shared/types";

type Errores = Record<string, string>;

interface EvidencePanelProps {
  auditId: number;
  controles: AuditControlDTO[];
  soloLectura: boolean;
  onAviso: (aviso: Aviso) => void;
  onActualizado?: () => void;
}

export function EvidencePanel({
  auditId,
  controles,
  soloLectura,
  onAviso,
  onActualizado,
}: EvidencePanelProps) {
  const [seleccionManual, setSeleccionManual] = useState<number | null>(null);
  const [description, setDescription] = useState("");
  const [source, setSource] = useState("");
  const [evidenceDate, setEvidenceDate] = useState("");
  const [reference, setReference] = useState("");
  const [isSimulated, setIsSimulated] = useState(true);
  const [errores, setErrores] = useState<Errores>({});
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [evidenciaABorrar, setEvidenciaABorrar] = useState<EvidenceDTO | null>(null);

  const seleccionado =
    seleccionManual !== null && controles.some((item) => item.control_id === seleccionManual)
      ? seleccionManual
      : (controles.find((item) => item.status !== "pendiente") ?? controles[0])?.control_id ?? null;

  const ruta = seleccionado === null ? null : `/api/audits/${auditId}/evaluations/${seleccionado}/evidences`;
  const evidencias = useApiResource<EvidenceDTO[]>(ruta);

  const control = controles.find((item) => item.control_id === seleccionado) ?? null;

  const enviar = async (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    setErrorGeneral(null);
    if (ruta === null) return;

    const { valores, errores: erroresLocales } = validarCon(evidenciaEsquema, {
      description,
      source,
      evidence_date: evidenceDate,
      reference,
      is_simulated: isSimulated,
    });
    setErrores(erroresLocales);
    if (!valores) return;

    setEnviando(true);
    try {
      await apiPost<EvidenceDTO>(ruta, valores);
      setDescription("");
      setSource("");
      setEvidenceDate("");
      setReference("");
      setIsSimulated(true);
      onAviso({ mensaje: "Evidencia registrada correctamente.", tone: "success" });
      evidencias.reload();
      onActualizado?.();
    } catch (error) {
      setErrores(erroresServidor(error, ["description", "source", "evidence_date", "reference", "is_simulated"]));
      setErrorGeneral(mensajeError(error));
      onAviso({ mensaje: mensajeError(error), tone: "error" });
    } finally {
      setEnviando(false);
    }
  };

  const borrar = async () => {
    if (!evidenciaABorrar) return;
    try {
      await apiDelete(`/api/evidences/${evidenciaABorrar.id}`);
      setEvidenciaABorrar(null);
      onAviso({ mensaje: "Evidencia eliminada correctamente.", tone: "success" });
      evidencias.reload();
      onActualizado?.();
    } catch (error) {
      onAviso({ mensaje: mensajeError(error), tone: "error" });
    }
  };

  if (!controles.length) {
    return (
      <Card className="p-6 sm:p-8">
        <h3 className="text-base font-semibold text-slate-900">No hay controles disponibles</h3>
        <p className="mt-1 text-sm text-slate-600">
          Las evidencias se asocian a un control evaluado de la auditoría.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {soloLectura ? (
        <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
          Auditoría cerrada: solo lectura. No se pueden añadir ni eliminar evidencias.
        </p>
      ) : null}

      <Card className="p-4 sm:p-5">
        <div className="grid gap-4 lg:grid-cols-2">
          <SelectField
            id="evidencia-control"
            label="Control evaluado"
            value={String(seleccionado ?? "")}
            onChange={(valor) => setSeleccionManual(Number(valor))}
            options={controles.map((item) => ({
              value: String(item.control_id),
              label: `${item.control.code} — ${item.control.name}`,
            }))}
          />
          {control ? (
            <div className="flex flex-wrap items-center gap-2 self-end text-sm">
              <ToneBadge tone={tonoControl(control.status)}>{statusLabel(control.status)}</ToneBadge>
              <Link
                href={`/audits/${auditId}?tab=evaluaciones`}
                className="text-sm font-medium text-slate-800 underline underline-offset-2"
              >
                Ver evaluación del control
              </Link>
              <Link
                href={`/audits/${auditId}?tab=hallazgos`}
                className="text-sm font-medium text-slate-800 underline underline-offset-2"
              >
                Ver hallazgos
              </Link>
            </div>
          ) : null}
        </div>
      </Card>

      {!soloLectura ? (
        <Card className="p-4 sm:p-5">
          <h3 className="text-base font-semibold text-slate-900">Nueva evidencia</h3>
          <form onSubmit={enviar} noValidate className="mt-4 space-y-4">
            <TextAreaField
              id="evidencia-description"
              label="Descripción"
              value={description}
              onChange={setDescription}
              error={errores.description}
              disabled={enviando}
              rows={3}
              maxLength={500}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                id="evidencia-source"
                label="Fuente"
                value={source}
                onChange={(evento) => setSource(evento.target.value)}
                error={errores.source}
                disabled={enviando}
                maxLength={500}
                placeholder="Documento, sistema o entrevista"
              />
              <Field
                id="evidencia-date"
                label="Fecha"
                type="date"
                value={evidenceDate}
                onChange={(evento) => setEvidenceDate(evento.target.value)}
                error={errores.evidence_date}
                disabled={enviando}
              />
            </div>
            <Field
              id="evidencia-reference"
              label="Referencia"
              value={reference}
              onChange={(evento) => setReference(evento.target.value)}
              error={errores.reference}
              disabled={enviando}
              maxLength={200}
              placeholder="Código de documento o registro"
            />
            <CheckboxField
              id="evidencia-simulada"
              label="Simulada"
              checked={isSimulated}
              onChange={setIsSimulated}
              disabled={enviando}
              error={errores.is_simulated}
              descripcion="Las evidencias de este ejercicio son simuladas."
            />
            {errorGeneral ? (
              <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                {errorGeneral}
              </p>
            ) : null}
            <div className="flex justify-end">
              <Button type="submit" loading={enviando}>
                {enviando ? "Guardando…" : "Añadir evidencia"}
              </Button>
            </div>
          </form>
        </Card>
      ) : null}

      <div>
        <h3 className="mb-3 text-base font-semibold text-slate-900">Evidencias del control</h3>
        {evidencias.loading ? <Loading label="Cargando evidencias…" /> : null}
        {!evidencias.loading && evidencias.error ? (
          <ErrorState
            title="No se pudieron cargar las evidencias"
            message={evidencias.error}
            onRetry={evidencias.reload}
          />
        ) : null}
        {!evidencias.loading && !evidencias.error && evidencias.data?.length === 0 ? (
          <Card className="p-6 text-sm text-slate-600">
            No hay evidencias registradas para este control.
          </Card>
        ) : null}
        <ul className="space-y-3">
          {(evidencias.data ?? []).map((evidencia) => (
            <li key={evidencia.id}>
              <Card className="min-w-0 p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="break-words text-sm text-slate-800">{evidencia.description}</p>
                    <dl className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
                      <div className="flex gap-1">
                        <dt className="font-medium">Fecha:</dt>
                        <dd>{evidencia.evidence_date}</dd>
                      </div>
                      <div className="flex gap-1">
                        <dt className="font-medium">Fuente:</dt>
                        <dd className="break-words">{evidencia.source}</dd>
                      </div>
                      <div className="flex gap-1">
                        <dt className="font-medium">Referencia:</dt>
                        <dd className="break-words">{evidencia.reference}</dd>
                      </div>
                    </dl>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
                    <ToneBadge tone={evidencia.is_simulated ? "warning" : "neutral"}>
                      {evidencia.is_simulated ? "Simulada" : "No simulada"}
                    </ToneBadge>
                    {!soloLectura ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEvidenciaABorrar(evidencia)}
                      >
                        Eliminar
                      </Button>
                    ) : null}
                  </div>
                </div>
                <p className="mt-3 text-xs text-slate-500">
                  Control {control?.control.code}: {control?.control.name} ·{" "}
                  <Link
                    href={`/audits/${auditId}?tab=evaluaciones`}
                    className="font-medium text-slate-800 underline underline-offset-2"
                  >
                    Ir a la auditoría y su evaluación
                  </Link>
                </p>
              </Card>
            </li>
          ))}
        </ul>
      </div>

      <ConfirmDialog
        open={evidenciaABorrar !== null}
        title="Eliminar evidencia"
        message="¿Seguro que quieres eliminar esta evidencia? La acción no se puede deshacer."
        confirmLabel="Eliminar"
        destructive
        onConfirm={() => void borrar()}
        onCancel={() => setEvidenciaABorrar(null)}
      />
    </div>
  );
}

export default EvidencePanel;

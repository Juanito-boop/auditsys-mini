/** Formulario de alta y edición de auditorías (validación en cliente). */

"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { SelectField, TextAreaField } from "@/components/ui/FormControls";
import { AUDIT_STATUS_LABELS } from "@/shared/constants";
import type { AuditDTO, AuditStatus } from "@/shared/types";
import { erroresServidor, mensajeError, statusLabel } from "@/lib/ui";
import { estadosCreacionAuditoria } from "@/lib/validation";
import { auditoriaEsquema, validarCon } from "@/lib/validation";

export interface AuditoriaFormData {
  organization: string;
  objective: string;
  scope: string;
  audit_date: string;
  status: AuditStatus;
  auditor_id?: number;
}

type Errores = Record<string, string>;

const CAMPOS = ["organization", "objective", "scope", "audit_date", "status", "auditor_id"];

export interface AuditFormProps {
  initial?: AuditDTO | null;
  esAdmin: boolean;
  soloLectura?: boolean;
  onSubmit: (datos: AuditoriaFormData) => Promise<void>;
  onCancel?: () => void;
  submitLabel?: string;
}

export function AuditForm({
  initial,
  esAdmin,
  soloLectura = false,
  onSubmit,
  onCancel,
  submitLabel = "Guardar auditoría",
}: AuditFormProps) {
  const [organization, setOrganization] = useState(initial?.organization ?? "");
  const [objective, setObjective] = useState(initial?.objective ?? "");
  const [scope, setScope] = useState(initial?.scope ?? "");
  const [auditDate, setAuditDate] = useState(initial?.audit_date ?? "");
  const [status, setStatus] = useState<AuditStatus>(initial?.status ?? "borrador");
  const [auditorId, setAuditorId] = useState(initial ? String(initial.auditor_id) : "");
  const [errores, setErrores] = useState<Errores>({});
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const enviar = async (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    setErrorGeneral(null);

    const { valores, errores: erroresLocales } = validarCon(auditoriaEsquema, {
      organization,
      objective,
      scope,
      audit_date: auditDate,
      status,
      auditor_id: esAdmin ? auditorId : undefined,
    });

    setErrores(erroresLocales);
    if (!valores) {
      const primero = Object.keys(erroresLocales)[0];
      if (primero) document.getElementById(`auditoria-${primero}`)?.focus();
      return;
    }

    setEnviando(true);
    try {
      await onSubmit({
        ...valores,
        ...(valores.auditor_id !== undefined ? { auditor_id: valores.auditor_id } : {}),
      });
    } catch (error) {
      setErrores(erroresServidor(error, CAMPOS));
      setErrorGeneral(mensajeError(error));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <form onSubmit={enviar} noValidate className="space-y-4">
      <Field
        id="auditoria-organization"
        label="Organización"
        value={organization}
        onChange={(evento) => setOrganization(evento.target.value)}
        error={errores.organization}
        disabled={enviando || soloLectura}
        maxLength={150}
        placeholder="Nombre de la organización auditada"
      />
      <TextAreaField
        id="auditoria-objective"
        label="Objetivo"
        value={objective}
        onChange={setObjective}
        error={errores.objective}
        disabled={enviando || soloLectura}
        rows={3}
        maxLength={500}
        placeholder="Qué se pretende conseguir con la auditoría"
      />
      <TextAreaField
        id="auditoria-scope"
        label="Alcance"
        value={scope}
        onChange={setScope}
        error={errores.scope}
        disabled={enviando || soloLectura}
        rows={3}
        maxLength={500}
        placeholder="Procesos, sistemas y límites incluidos en la auditoría"
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          id="auditoria-audit_date"
          label="Fecha de la auditoría"
          type="date"
          value={auditDate}
          onChange={(evento) => setAuditDate(evento.target.value)}
          error={errores.audit_date}
          disabled={enviando || soloLectura}
        />
        {initial ? (
          <div className="space-y-1.5">
            <p className="block text-sm font-medium text-slate-800">Estado</p>
            <p className="text-sm text-slate-700">{statusLabel(status)}</p>
            <p className="text-xs text-slate-500">
              El estado se cambia con el selector de estado de la auditoría.
            </p>
          </div>
        ) : (
          <SelectField
            id="auditoria-status"
            label="Estado inicial"
            value={status}
            onChange={(valor) => setStatus(valor as AuditStatus)}
            error={errores.status}
            disabled={enviando || soloLectura}
            options={estadosCreacionAuditoria.map((estado) => ({
              value: estado,
              label: AUDIT_STATUS_LABELS[estado],
            }))}
          />
        )}
      </div>

      {esAdmin && !initial ? (
        <Field
          id="auditoria-auditor_id"
          label="Responsable de la auditoría"
          inputMode="numeric"
          value={auditorId}
          onChange={(evento) => setAuditorId(evento.target.value)}
          error={errores.auditor_id}
          disabled={enviando || soloLectura}
          placeholder="Identificador numérico del usuario"
          hint="No hay un listado de usuarios en esta versión: introduce su identificador. Si lo dejas vacío, la auditoría se asignará a tu cuenta."
        />
      ) : null}

      {errorGeneral ? (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {errorGeneral}
        </p>
      ) : null}

      {soloLectura ? (
        <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
          Auditoría cerrada: solo lectura. Estado actual: {statusLabel(status)}.
        </p>
      ) : null}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        {onCancel ? (
          <Button variant="secondary" onClick={onCancel} disabled={enviando}>
            Cancelar
          </Button>
        ) : null}
        <Button type="submit" loading={enviando} disabled={soloLectura}>
          {enviando ? "Guardando…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}

export default AuditForm;

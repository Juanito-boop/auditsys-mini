/** Formateadores y ayudas de clase para la interfaz, en español (es-ES). */

import {
  AUDIT_STATUS_LABELS,
  CONTROL_STATUS_LABELS,
  SEVERITY_LABELS,
  THEME_LABELS,
} from "@/shared/constants";
import type { AuditStatus, ControlStatus, Severity, Theme } from "@/shared/types";

const formateadorFecha = new Intl.DateTimeFormat("es-ES", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

const formateadorNumero = new Intl.NumberFormat("es-ES", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

/** Formatea una fecha `YYYY-MM-DD` (o ISO con hora) en formato es-ES. */
export function formatDate(valor: string | null | undefined): string {
  if (!valor) return "N/A";
  const [anio, mes, dia] = valor.slice(0, 10).split("-").map(Number);
  if (!anio || !mes || !dia) return "N/A";
  const fecha = new Date(Date.UTC(anio, mes - 1, dia));
  if (Number.isNaN(fecha.getTime())) return "N/A";
  return formateadorFecha.format(fecha);
}

/** Formatea un porcentaje ya expresado en tanto por ciento (55,6 → «55,6 %»). */
export function formatPercent(valor: number | null | undefined): string {
  if (valor === null || valor === undefined || !Number.isFinite(valor)) return "N/A";
  return `${formateadorNumero.format(valor)} %`;
}

/** Etiqueta legible para cualquier estado, severidad o tema compartido. */
export function statusLabel(valor: AuditStatus | ControlStatus | Severity | Theme): string {
  if (valor in AUDIT_STATUS_LABELS) return AUDIT_STATUS_LABELS[valor as AuditStatus];
  if (valor in CONTROL_STATUS_LABELS) return CONTROL_STATUS_LABELS[valor as ControlStatus];
  if (valor in SEVERITY_LABELS) return SEVERITY_LABELS[valor as Severity];
  if (valor in THEME_LABELS) return THEME_LABELS[valor as Theme];
  return String(valor);
}

/** Concatena clases condicionales sin dependencias externas. */
export function cx(...clases: Array<string | false | null | undefined>): string {
  return clases.filter(Boolean).join(" ");
}

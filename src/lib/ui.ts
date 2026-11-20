/** Formateadores y ayudas de clase para la interfaz, en español (es-ES). */

import {
  AUDIT_STATUS_LABELS,
  CONTROL_STATUS_LABELS,
  SEVERITY_LABELS,
  THEME_LABELS,
} from "@/shared/constants";
import type { AuditStatus, ControlStatus, Priority, Severity, Theme } from "@/shared/types";

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

/** Aviso breve mostrado al usuario mediante `Toast`. */
export interface Aviso {
  mensaje: string;
  tone: "success" | "error";
}

/** Opciones derivadas de las etiquetas compartidas: nunca se separan de el contrato. */
export const ESTADOS_AUDITORIA = Object.keys(AUDIT_STATUS_LABELS) as AuditStatus[];
export const ESTADOS_CONTROL = Object.keys(CONTROL_STATUS_LABELS) as ControlStatus[];
export const SEVERIDADES = Object.keys(SEVERITY_LABELS) as Severity[];
export const TEMAS = Object.keys(THEME_LABELS) as Theme[];
export const PRIORIDADES: Priority[] = ["baja", "media", "alta"];

/** Extrae un mensaje legible de cualquier error, incluidos errores de red. */
export function mensajeError(
  error: unknown,
  fallback = "Ocurrió un error inesperado. Inténtalo de nuevo.",
): string {
  return error instanceof Error && error.message.trim() ? error.message : fallback;
}

/** Traduce los `details` del backend a errores por campo de formulario. */
export function erroresServidor(error: unknown, campos: string[]): Record<string, string> {
  const detalles = (error as { details?: Array<{ path: string; message: string }> } | null)?.details;
  const errores: Record<string, string> = {};
  if (!Array.isArray(detalles)) return errores;

  for (const detalle of detalles) {
    const campo = detalle.path.split(".").pop() ?? "";
    if (campos.includes(campo) && !errores[campo]) errores[campo] = detalle.message;
  }
  return errores;
}

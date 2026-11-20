/** Textos y etiquetas compartidos. Sin importar módulos de servidor. */

import type { AuditStatus, ControlStatus, Severity, Theme } from "./types";

export const AUDIT_STATUS_LABELS = {
  borrador: "Borrador",
  en_curso: "En curso",
  cerrada: "Cerrada",
} as const satisfies Record<AuditStatus, string>;

export const CONTROL_STATUS_LABELS = {
  pendiente: "Pendiente",
  implementado: "Implementado",
  parcialmente_implementado: "Parcialmente implementado",
  no_implementado: "No implementado",
  no_aplicable: "No aplicable",
} as const satisfies Record<ControlStatus, string>;

export const SEVERITY_LABELS = {
  baja: "Baja",
  media: "Media",
  alta: "Alta",
  critica: "Crítica",
} as const satisfies Record<Severity, string>;

export const THEME_LABELS = {
  Organizacional: "Organizacional",
  Personas: "Personas",
  Físico: "Físico",
  Tecnológico: "Tecnológico",
} as const satisfies Record<Theme, string>;

export const FORMULA =
  "% = (cantidad / (evaluados − no_aplicables)) × 100. Evaluados = estados distintos de 'pendiente'. Los pendientes se muestran aparte.";

export const LIMITACIONES = [
  "La aplicación no certifica a ninguna organización ni determina por sí sola el cumplimiento normativo.",
  "El indicador no sustituye el juicio profesional del auditor.",
  "Las evidencias del ejercicio son simuladas.",
] as const;

export const AVISO_NO_CERTIFICA =
  "Este informe es un ejercicio académico de auditoría; no constituye una certificación ni determina el cumplimiento normativo.";

export const REFERENTES = [
  "ISO/IEC 27001:2022",
  "ISO/IEC 27002:2022",
  "ISO 19011:2018",
] as const;

/** Clases Tailwind para badges de estado de control. */
export const STATUS_COLORS = {
  implementado: "bg-emerald-100 text-emerald-800 border border-emerald-300",
  parcialmente_implementado: "bg-amber-100 text-amber-800 border border-amber-300",
  no_implementado: "bg-red-100 text-red-800 border border-red-300",
  no_aplicable: "bg-gray-100 text-gray-700 border border-gray-300",
  pendiente: "bg-slate-50 text-slate-600 border border-slate-200",
} as const satisfies Record<ControlStatus, string>;

/** Los 15 controles del ejercicio, con nombre corto y tema ISO 27001:2022. */
export const CONTROL_CODES = [
  { code: "5.1", name: "Políticas de seguridad", theme: "Organizacional" },
  { code: "5.9", name: "Inventario de activos", theme: "Organizacional" },
  { code: "5.15", name: "Gestión del acceso", theme: "Organizacional" },
  { code: "5.17", name: "Información de autenticación", theme: "Organizacional" },
  { code: "5.24", name: "Gestión de incidentes", theme: "Organizacional" },
  { code: "5.30", name: "Continuidad de TI", theme: "Organizacional" },
  { code: "6.3", name: "Concienciación y formación", theme: "Personas" },
  { code: "8.2", name: "Privilegios de acceso", theme: "Tecnológico" },
  { code: "8.5", name: "Acceso seguro a sistemas", theme: "Tecnológico" },
  { code: "8.7", name: "Protección contra malware", theme: "Tecnológico" },
  { code: "8.8", name: "Vulnerabilidades técnicas", theme: "Tecnológico" },
  { code: "8.13", name: "Copias de seguridad", theme: "Tecnológico" },
  { code: "8.15", name: "Registros de auditoría", theme: "Tecnológico" },
  { code: "8.23", name: "Restricción de sitios web", theme: "Tecnológico" },
  { code: "8.24", name: "Uso de criptografía", theme: "Tecnológico" },
] as const satisfies ReadonlyArray<{ code: string; name: string; theme: Theme }>;

export type ControlCode = (typeof CONTROL_CODES)[number]["code"];

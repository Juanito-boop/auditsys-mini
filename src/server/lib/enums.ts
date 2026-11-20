/** Enumeraciones runtime derivadas de los tipos compartidos (Zod las necesita como valores). */

export const auditStatusValues = ["borrador", "en_curso", "cerrada"] as const;
export const controlStatusValues = [
  "pendiente",
  "implementado",
  "parcialmente_implementado",
  "no_implementado",
  "no_aplicable",
] as const;
export const severityValues = ["baja", "media", "alta", "critica"] as const;
export const priorityValues = ["baja", "media", "alta"] as const;
export const themeValues = ["Organizacional", "Personas", "Físico", "Tecnológico"] as const;
export const printRequestOriginValues = ["resultados", "informe"] as const;

export type PrintRequestOrigin = (typeof printRequestOriginValues)[number];

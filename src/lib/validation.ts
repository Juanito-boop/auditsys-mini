/** Validaciones de formulario en el cliente, con mensajes en español. */

import { z } from "zod";
import {
  ESTADOS_AUDITORIA,
  ESTADOS_CONTROL,
  PRIORIDADES,
  SEVERIDADES,
  TEMAS,
} from "./ui";

function esFechaISO(valor: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;
  const [anio, mes, dia] = valor.split("-").map(Number);
  const fecha = new Date(Date.UTC(anio, mes - 1, dia));
  return (
    fecha.getUTCFullYear() === anio &&
    fecha.getUTCMonth() === mes - 1 &&
    fecha.getUTCDate() === dia
  );
}

function texto(etiqueta: string, min: number, max: number): z.ZodString {
  return z
    .string()
    .trim()
    .min(min, `${etiqueta} debe tener al menos ${min} ${min === 1 ? "carácter" : "caracteres"}.`)
    .max(max, `${etiqueta} no puede superar ${max} caracteres.`);
}

function textoOpcional(etiqueta: string, max: number): z.ZodString {
  return z.string().trim().max(max, `${etiqueta} no puede superar ${max} caracteres.`);
}

function fecha(etiqueta: string): z.ZodString {
  return z.string().refine(esFechaISO, `${etiqueta} debe ser una fecha válida (AAAA-MM-DD).`);
}

function identificador(etiqueta: string) {
  return z.coerce
    .number()
    .int(`${etiqueta} debe ser un número entero.`)
    .positive(`${etiqueta} debe ser un número positivo.`);
}

/** El identificador de responsable puede venir vacío del campo de texto. */
const auditorIdOpcional = z.preprocess(
  (valor) => (valor === "" || valor === null ? undefined : valor),
  identificador("El responsable").optional(),
);

/** La creación no permite estado cerrado: se cierra con el PATCH de estado. */
export const estadosCreacionAuditoria = ESTADOS_AUDITORIA.filter((estado) => estado !== "cerrada");

export const auditoriaEsquema = z.object({
  organization: texto("La organización", 2, 150),
  objective: texto("El objetivo", 2, 500),
  scope: texto("El alcance", 2, 500),
  audit_date: fecha("La fecha de auditoría"),
  status: z.enum(estadosCreacionAuditoria),
  auditor_id: auditorIdOpcional,
});

export const controlEsquema = z.object({
  code: texto("El código", 1, 30),
  name: texto("El nombre", 2, 150),
  description: texto("La descripción", 2, 2000),
  criterion: texto("El criterio", 2, 2000),
  source: texto("La fuente", 2, 150),
  theme: z.enum(TEMAS),
  active: z.boolean(),
});

export const evaluacionEsquema = z
  .object({
    status: z.enum(ESTADOS_CONTROL),
    observations: textoOpcional("Las observaciones", 2000),
    na_justification: z.preprocess(
      (valor) => (valor === "" ? null : valor),
      textoOpcional("La justificación", 2000).nullable(),
    ),
  })
  .superRefine((datos, contexto) => {
    if (datos.status === "no_aplicable" && !datos.na_justification?.trim()) {
      contexto.addIssue({
        code: "custom",
        path: ["na_justification"],
        message: "La justificación es obligatoria cuando el control no es aplicable.",
      });
    }
  });

export const evidenciaEsquema = z.object({
  description: texto("La descripción", 2, 500),
  source: texto("La fuente", 2, 500),
  evidence_date: fecha("La fecha de la evidencia"),
  reference: textoOpcional("La referencia", 200),
  is_simulated: z.boolean(),
});

const textoHallazgo = (etiqueta: string) => texto(etiqueta, 2, 1000);

export const hallazgoEsquema = z.object({
  audit_control_id: identificador("El control"),
  condition: textoHallazgo("La condición"),
  criterion: textoHallazgo("El criterio"),
  cause: textoHallazgo("La causa"),
  effect_risk: textoHallazgo("El efecto o riesgo"),
  severity: z.enum(SEVERIDADES),
});

export const recomendacionEsquema = z.object({
  description: textoHallazgo("La descripción"),
  priority: z.enum(PRIORIDADES),
});

export interface ResultadoValidacion<T> {
  valores?: T;
  errores: Record<string, string>;
}

/** Envuelve `safeParse` para obtener errores por campo en lugar de excepciones. */
export function validarCon<S extends z.ZodType>(
  esquema: S,
  datos: unknown,
): ResultadoValidacion<z.output<S>> {
  const resultado = esquema.safeParse(datos);
  if (resultado.success) return { valores: resultado.data, errores: {} };

  const errores: Record<string, string> = {};
  for (const issue of resultado.error.issues) {
    const campo = String(issue.path[0] ?? "general");
    if (!errores[campo]) errores[campo] = issue.message;
  }
  return { errores };
}

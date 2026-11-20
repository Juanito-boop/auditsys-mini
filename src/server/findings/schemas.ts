import { z } from "zod";
import { priorityValues, severityValues } from "@/server/lib/enums";

const textoHallazgo = z
  .string()
  .trim()
  .min(2, "Debe tener al menos 2 caracteres.")
  .max(1000, "No puede superar los 1000 caracteres.");

export const findingCreateSchema = z.object({
  audit_control_id: z.number().int().positive(),
  condition: textoHallazgo,
  criterion: textoHallazgo,
  cause: textoHallazgo,
  effect_risk: textoHallazgo,
  severity: z.enum(severityValues),
});

export const findingUpdateSchema = findingCreateSchema;
export const findingIdParamSchema = z.object({ id: z.coerce.number().int().positive() });
export const auditFindingParamsSchema = z.object({ id: z.coerce.number().int().positive() });

export const recommendationCreateSchema = z.object({
  description: textoHallazgo,
  priority: z.enum(priorityValues),
});

export const recommendationUpdateSchema = z
  .object({
    description: textoHallazgo.optional(),
    priority: z.enum(priorityValues).optional(),
  })
  .refine((valor) => valor.description !== undefined || valor.priority !== undefined, {
    message: "Debes enviar al menos la descripción o la prioridad.",
  });

export const recommendationIdParamSchema = z.object({ id: z.coerce.number().int().positive() });
export const findingRecommendationParamsSchema = z.object({ id: z.coerce.number().int().positive() });

export type FindingCreateInput = z.infer<typeof findingCreateSchema>;
export type RecommendationCreateInput = z.infer<typeof recommendationCreateSchema>;
export type RecommendationUpdateInput = z.infer<typeof recommendationUpdateSchema>;

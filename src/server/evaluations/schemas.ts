import { z } from "zod";
import { controlStatusValues } from "@/server/lib/enums";

export const evaluationUpdateSchema = z.object({
  status: z.enum(controlStatusValues),
  observations: z.string().max(2000, "Las observaciones no pueden superar los 2000 caracteres.").optional(),
  na_justification: z
    .string()
    .max(2000, "La justificación no puede superar los 2000 caracteres.")
    .nullable()
    .optional(),
});

export const auditIdParamSchema = z.object({ id: z.coerce.number().int().positive() });
export const evaluationListQuerySchema = z.object({ status: z.enum(controlStatusValues).optional() });
export const evaluationParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
  controlId: z.coerce.number().int().positive(),
});

export type EvaluationUpdateInput = z.infer<typeof evaluationUpdateSchema>;

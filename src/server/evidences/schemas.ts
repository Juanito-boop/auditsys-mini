import { z } from "zod";

const fecha = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "La fecha debe tener el formato AAAA-MM-DD.");

export const evidenceCreateSchema = z.object({
  description: z.string().trim().min(2, "La descripción debe tener al menos 2 caracteres.").max(500),
  source: z.string().trim().min(2, "La fuente debe tener al menos 2 caracteres.").max(500),
  evidence_date: fecha,
  reference: z.string().trim().max(200).default(""),
  is_simulated: z.boolean().default(true),
});

export const evidenceParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
  controlId: z.coerce.number().int().positive(),
});
export const evidenceIdParamSchema = z.object({ id: z.coerce.number().int().positive() });

export type EvidenceCreateInput = z.infer<typeof evidenceCreateSchema>;

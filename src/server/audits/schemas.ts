import { z } from "zod";
import { auditStatusValues } from "@/server/lib/enums";

const fecha = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "La fecha debe tener el formato AAAA-MM-DD.");

export const auditCreateSchema = z.object({
  organization: z.string().trim().min(2, "La organización debe tener al menos 2 caracteres.").max(150),
  objective: z.string().trim().min(2, "El objetivo debe tener al menos 2 caracteres.").max(500),
  scope: z.string().trim().min(2, "El alcance debe tener al menos 2 caracteres.").max(500),
  audit_date: fecha,
  status: z.enum(["borrador", "en_curso"]).default("borrador"),
  auditor_id: z.number().int().positive().optional(),
});

export const auditUpdateSchema = auditCreateSchema.omit({ status: true, auditor_id: true });
export const auditStatusSchema = z.object({ status: z.enum(auditStatusValues) });
export const auditListQuerySchema = z.object({ status: z.enum(auditStatusValues).optional() });
export const auditIdParamSchema = z.object({ id: z.coerce.number().int().positive() });

/** `z.input` respeta los valores por defecto al llamar al servicio desde tests. */
export type AuditCreateInput = z.input<typeof auditCreateSchema>;
export type AuditUpdateInput = z.infer<typeof auditUpdateSchema>;
export type AuditStatusInput = z.infer<typeof auditStatusSchema>;

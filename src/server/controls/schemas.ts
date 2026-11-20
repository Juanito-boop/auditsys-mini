import { z } from "zod";
import { themeValues } from "@/server/lib/enums";

export const controlCreateSchema = z.object({
  code: z.string().trim().min(1, "El código es obligatorio.").max(30),
  name: z.string().trim().min(2, "El nombre debe tener al menos 2 caracteres.").max(150),
  description: z.string().trim().min(2, "La descripción debe tener al menos 2 caracteres.").max(2000),
  criterion: z.string().trim().min(2, "El criterio debe tener al menos 2 caracteres.").max(2000),
  source: z.string().trim().min(2, "La fuente debe tener al menos 2 caracteres.").max(150),
  theme: z.enum(themeValues),
  active: z.boolean(),
});

export const controlUpdateSchema = controlCreateSchema;
export const controlListQuerySchema = z.object({
  active: z.enum(["0", "1"]).optional(),
  theme: z.enum(themeValues).optional(),
});
export const controlIdParamSchema = z.object({ id: z.coerce.number().int().positive() });

export type ControlCreateInput = z.infer<typeof controlCreateSchema>;
export type ControlUpdateInput = z.infer<typeof controlUpdateSchema>;

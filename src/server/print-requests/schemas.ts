import { z } from "zod";
import { printRequestOriginValues } from "@/server/lib/enums";

/** La ruta usa el mismo esquema de parámetros que el resto de informes. */
export { reportParamsSchema } from "@/server/reports/schemas";

export const printRequestCreateSchema = z.strictObject({
  origin: z.enum(printRequestOriginValues),
  requestKey: z.uuid("La clave de solicitud debe ser un UUID válido."),
});

/** El listado no acepta filtros por query string. */
export const printRequestQuerySchema = z.strictObject({});

export type PrintRequestCreateInput = z.infer<typeof printRequestCreateSchema>;

import { z } from "zod";

/** El dashboard no admite filtros; se valida la query vacía por contrato. */
export const dashboardQuerySchema = z.object({});

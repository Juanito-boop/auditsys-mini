import { z } from "zod";

export const resultsParamsSchema = z.object({ id: z.coerce.number().int().positive() });
export const reportParamsSchema = z.object({ id: z.coerce.number().int().positive() });

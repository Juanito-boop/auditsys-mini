import { requireUser } from "@/server/auth/guards";
import { getDb } from "@/server/db/client";
import { reportParamsSchema } from "@/server/reports/schemas";
import { getReport } from "@/server/reports/service";
import { toErrorResponse } from "@/server/lib/errors";
import { jsonSuccess, parseParams } from "@/server/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Contexto = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Contexto) {
  try {
    const actor = await requireUser();
    const { id } = await parseParams(context.params, reportParamsSchema);
    return jsonSuccess(getReport({ db: getDb(), actor }, id));
  } catch (error) {
    return toErrorResponse(error);
  }
}

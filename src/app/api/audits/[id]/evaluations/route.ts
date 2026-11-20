import { requireUser } from "@/server/auth/guards";
import { getDb } from "@/server/db/client";
import {
  auditIdParamSchema,
  evaluationListQuerySchema,
} from "@/server/evaluations/schemas";
import { listEvaluations } from "@/server/evaluations/service";
import { toErrorResponse } from "@/server/lib/errors";
import { jsonSuccess, parseParams, parseQuery } from "@/server/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Contexto = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: Contexto) {
  try {
    const actor = await requireUser();
    const { id } = await parseParams(context.params, auditIdParamSchema);
    const { status } = parseQuery(request.url, evaluationListQuerySchema);
    return jsonSuccess(listEvaluations({ db: getDb(), actor }, id, status));
  } catch (error) {
    return toErrorResponse(error);
  }
}

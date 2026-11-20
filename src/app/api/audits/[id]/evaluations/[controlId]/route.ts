import { requireUser } from "@/server/auth/guards";
import { getDb } from "@/server/db/client";
import { evaluationParamsSchema, evaluationUpdateSchema } from "@/server/evaluations/schemas";
import { evaluateControl } from "@/server/evaluations/service";
import { toErrorResponse } from "@/server/lib/errors";
import { jsonSuccess, parseBody, parseParams } from "@/server/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Contexto = { params: Promise<{ id: string; controlId: string }> };

export async function PUT(request: Request, context: Contexto) {
  try {
    const actor = await requireUser();
    const { id, controlId } = await parseParams(context.params, evaluationParamsSchema);
    const input = await parseBody(request, evaluationUpdateSchema);
    return jsonSuccess(evaluateControl({ db: getDb(), actor }, id, controlId, input));
  } catch (error) {
    return toErrorResponse(error);
  }
}

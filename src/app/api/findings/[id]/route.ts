import { requireUser } from "@/server/auth/guards";
import { getDb } from "@/server/db/client";
import { findingIdParamSchema, findingUpdateSchema } from "@/server/findings/schemas";
import { deleteFinding, updateFinding } from "@/server/findings/service";
import { toErrorResponse } from "@/server/lib/errors";
import { jsonSuccess, parseBody, parseParams } from "@/server/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Contexto = { params: Promise<{ id: string }> };

export async function PUT(request: Request, context: Contexto) {
  try {
    const actor = await requireUser();
    const { id } = await parseParams(context.params, findingIdParamSchema);
    const input = await parseBody(request, findingUpdateSchema);
    return jsonSuccess(updateFinding({ db: getDb(), actor }, id, input));
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function DELETE(_request: Request, context: Contexto) {
  try {
    const actor = await requireUser();
    const { id } = await parseParams(context.params, findingIdParamSchema);
    return jsonSuccess(deleteFinding({ db: getDb(), actor }, id));
  } catch (error) {
    return toErrorResponse(error);
  }
}

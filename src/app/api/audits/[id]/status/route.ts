import { requireUser } from "@/server/auth/guards";
import { auditIdParamSchema, auditStatusSchema } from "@/server/audits/schemas";
import { updateAuditStatus } from "@/server/audits/service";
import { getDb } from "@/server/db/client";
import { toErrorResponse } from "@/server/lib/errors";
import { jsonSuccess, parseBody, parseParams } from "@/server/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Contexto = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Contexto) {
  try {
    const actor = await requireUser();
    const { id } = await parseParams(context.params, auditIdParamSchema);
    const input = await parseBody(request, auditStatusSchema);
    return jsonSuccess(updateAuditStatus({ db: getDb(), actor }, id, input));
  } catch (error) {
    return toErrorResponse(error);
  }
}

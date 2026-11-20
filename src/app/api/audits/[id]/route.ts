import { requireUser } from "@/server/auth/guards";
import { auditIdParamSchema, auditUpdateSchema } from "@/server/audits/schemas";
import { getAuditDetail, updateAudit } from "@/server/audits/service";
import { getDb } from "@/server/db/client";
import { toErrorResponse } from "@/server/lib/errors";
import { jsonSuccess, parseBody, parseParams } from "@/server/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Contexto = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Contexto) {
  try {
    const actor = await requireUser();
    const { id } = await parseParams(context.params, auditIdParamSchema);
    return jsonSuccess(getAuditDetail({ db: getDb(), actor }, id));
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function PUT(request: Request, context: Contexto) {
  try {
    const actor = await requireUser();
    const { id } = await parseParams(context.params, auditIdParamSchema);
    const input = await parseBody(request, auditUpdateSchema);
    return jsonSuccess(updateAudit({ db: getDb(), actor }, id, input));
  } catch (error) {
    return toErrorResponse(error);
  }
}

import { requireUser } from "@/server/auth/guards";
import { getDb } from "@/server/db/client";
import { evidenceIdParamSchema } from "@/server/evidences/schemas";
import { deleteEvidence } from "@/server/evidences/service";
import { toErrorResponse } from "@/server/lib/errors";
import { jsonSuccess, parseParams } from "@/server/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Contexto = { params: Promise<{ id: string }> };

export async function DELETE(_request: Request, context: Contexto) {
  try {
    const actor = await requireUser();
    const { id } = await parseParams(context.params, evidenceIdParamSchema);
    return jsonSuccess(deleteEvidence({ db: getDb(), actor }, id));
  } catch (error) {
    return toErrorResponse(error);
  }
}

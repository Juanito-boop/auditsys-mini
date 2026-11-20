import { requireUser } from "@/server/auth/guards";
import { getDb } from "@/server/db/client";
import { evidenceCreateSchema, evidenceParamsSchema } from "@/server/evidences/schemas";
import { createEvidence, listEvidences } from "@/server/evidences/service";
import { toErrorResponse } from "@/server/lib/errors";
import { jsonSuccess, parseBody, parseParams } from "@/server/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Contexto = { params: Promise<{ id: string; controlId: string }> };

export async function GET(_request: Request, context: Contexto) {
  try {
    const actor = await requireUser();
    const { id, controlId } = await parseParams(context.params, evidenceParamsSchema);
    return jsonSuccess(listEvidences({ db: getDb(), actor }, id, controlId));
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request: Request, context: Contexto) {
  try {
    const actor = await requireUser();
    const { id, controlId } = await parseParams(context.params, evidenceParamsSchema);
    const input = await parseBody(request, evidenceCreateSchema);
    return jsonSuccess(createEvidence({ db: getDb(), actor }, id, controlId, input), 201);
  } catch (error) {
    return toErrorResponse(error);
  }
}

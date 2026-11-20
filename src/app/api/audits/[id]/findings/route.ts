import { requireUser } from "@/server/auth/guards";
import { getDb } from "@/server/db/client";
import { auditFindingParamsSchema, findingCreateSchema } from "@/server/findings/schemas";
import { createFinding, listFindings } from "@/server/findings/service";
import { toErrorResponse } from "@/server/lib/errors";
import { jsonSuccess, parseBody, parseParams } from "@/server/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Contexto = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Contexto) {
  try {
    const actor = await requireUser();
    const { id } = await parseParams(context.params, auditFindingParamsSchema);
    return jsonSuccess(listFindings({ db: getDb(), actor }, id));
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request: Request, context: Contexto) {
  try {
    const actor = await requireUser();
    const { id } = await parseParams(context.params, auditFindingParamsSchema);
    const input = await parseBody(request, findingCreateSchema);
    return jsonSuccess(createFinding({ db: getDb(), actor }, id, input), 201, "El hallazgo no tiene recomendación asociada");
  } catch (error) {
    return toErrorResponse(error);
  }
}

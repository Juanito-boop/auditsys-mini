import { requireAdmin } from "@/server/auth/guards";
import { controlIdParamSchema, controlUpdateSchema } from "@/server/controls/schemas";
import { updateControl } from "@/server/controls/service";
import { getDb } from "@/server/db/client";
import { toErrorResponse } from "@/server/lib/errors";
import { jsonSuccess, parseBody, parseParams } from "@/server/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Contexto = { params: Promise<{ id: string }> };

export async function PUT(request: Request, context: Contexto) {
  try {
    const actor = await requireAdmin();
    const { id } = await parseParams(context.params, controlIdParamSchema);
    const input = await parseBody(request, controlUpdateSchema);
    return jsonSuccess(updateControl({ db: getDb(), actor }, id, input));
  } catch (error) {
    return toErrorResponse(error);
  }
}

import { requireUser } from "@/server/auth/guards";
import { getDb } from "@/server/db/client";
import {
  recommendationIdParamSchema,
  recommendationUpdateSchema,
} from "@/server/findings/schemas";
import { deleteRecommendation, updateRecommendation } from "@/server/findings/service";
import { toErrorResponse } from "@/server/lib/errors";
import { jsonSuccess, parseBody, parseParams } from "@/server/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Contexto = { params: Promise<{ id: string }> };

export async function PUT(request: Request, context: Contexto) {
  try {
    const actor = await requireUser();
    const { id } = await parseParams(context.params, recommendationIdParamSchema);
    const input = await parseBody(request, recommendationUpdateSchema);
    return jsonSuccess(updateRecommendation({ db: getDb(), actor }, id, input));
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function DELETE(_request: Request, context: Contexto) {
  try {
    const actor = await requireUser();
    const { id } = await parseParams(context.params, recommendationIdParamSchema);
    return jsonSuccess(deleteRecommendation({ db: getDb(), actor }, id));
  } catch (error) {
    return toErrorResponse(error);
  }
}

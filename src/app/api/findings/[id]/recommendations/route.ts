import { requireUser } from "@/server/auth/guards";
import { getDb } from "@/server/db/client";
import {
  findingRecommendationParamsSchema,
  recommendationCreateSchema,
} from "@/server/findings/schemas";
import { createRecommendation } from "@/server/findings/service";
import { toErrorResponse } from "@/server/lib/errors";
import { jsonSuccess, parseBody, parseParams } from "@/server/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Contexto = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: Contexto) {
  try {
    const actor = await requireUser();
    const { id } = await parseParams(context.params, findingRecommendationParamsSchema);
    const input = await parseBody(request, recommendationCreateSchema);
    return jsonSuccess(createRecommendation({ db: getDb(), actor }, id, input), 201);
  } catch (error) {
    return toErrorResponse(error);
  }
}

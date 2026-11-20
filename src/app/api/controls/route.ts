import { requireAdmin, requireUser } from "@/server/auth/guards";
import { controlCreateSchema, controlListQuerySchema } from "@/server/controls/schemas";
import { createControl, listControls } from "@/server/controls/service";
import { getDb } from "@/server/db/client";
import { toErrorResponse } from "@/server/lib/errors";
import { jsonSuccess, parseBody, parseQuery } from "@/server/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const actor = await requireUser();
    const filtros = parseQuery(request.url, controlListQuerySchema);
    return jsonSuccess(listControls({ db: getDb(), actor }, filtros));
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireAdmin();
    const input = await parseBody(request, controlCreateSchema);
    return jsonSuccess(createControl({ db: getDb(), actor }, input), 201);
  } catch (error) {
    return toErrorResponse(error);
  }
}

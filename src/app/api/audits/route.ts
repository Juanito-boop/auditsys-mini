import { requireUser } from "@/server/auth/guards";
import { auditCreateSchema, auditListQuerySchema } from "@/server/audits/schemas";
import { createAudit, listAudits } from "@/server/audits/service";
import { getDb } from "@/server/db/client";
import { toErrorResponse } from "@/server/lib/errors";
import { jsonSuccess, parseBody, parseQuery } from "@/server/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const actor = await requireUser();
    const { status } = parseQuery(request.url, auditListQuerySchema);
    return jsonSuccess(listAudits({ db: getDb(), actor }, status));
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireUser();
    const input = await parseBody(request, auditCreateSchema);
    return jsonSuccess(createAudit({ db: getDb(), actor }, input), 201);
  } catch (error) {
    return toErrorResponse(error);
  }
}

import { requireUser } from "@/server/auth/guards";
import { getDb } from "@/server/db/client";
import { toErrorResponse } from "@/server/lib/errors";
import { jsonSuccess, parseBody, parseParams, parseQuery } from "@/server/lib/http";
import {
  printRequestCreateSchema,
  printRequestQuerySchema,
  reportParamsSchema,
} from "@/server/print-requests/schemas";
import { listPrintRequests, registerPrintRequest } from "@/server/print-requests/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Contexto = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: Contexto) {
  try {
    const actor = await requireUser();
    const { id } = await parseParams(context.params, reportParamsSchema);
    parseQuery(request.url, printRequestQuerySchema);
    return jsonSuccess(listPrintRequests({ db: getDb(), actor }, id));
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request: Request, context: Contexto) {
  try {
    const actor = await requireUser();
    const { id } = await parseParams(context.params, reportParamsSchema);
    const input = await parseBody(request, printRequestCreateSchema);
    const { dto, created } = registerPrintRequest({ db: getDb(), actor }, id, input);
    return jsonSuccess(
      dto,
      created ? 201 : 200,
      created ? "Solicitud de impresión registrada." : "La solicitud ya estaba registrada.",
    );
  } catch (error) {
    return toErrorResponse(error);
  }
}

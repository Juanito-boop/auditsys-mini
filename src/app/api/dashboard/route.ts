import { requireUser } from "@/server/auth/guards";
import { dashboardQuerySchema } from "@/server/dashboard/schemas";
import { getDashboard } from "@/server/dashboard/service";
import { getDb } from "@/server/db/client";
import { toErrorResponse } from "@/server/lib/errors";
import { jsonSuccess, parseQuery } from "@/server/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const actor = await requireUser();
    parseQuery(request.url, dashboardQuerySchema);
    return jsonSuccess(getDashboard({ db: getDb(), actor }));
  } catch (error) {
    return toErrorResponse(error);
  }
}

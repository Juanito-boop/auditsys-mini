import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME, requireUser } from "@/server/auth/guards";
import { toErrorResponse } from "@/server/lib/errors";
import { jsonSuccess } from "@/server/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  try {
    await requireUser();
    (await cookies()).delete(SESSION_COOKIE_NAME);
    return jsonSuccess({ ok: true }, 200, "Sesión cerrada");
  } catch (error) {
    return toErrorResponse(error);
  }
}

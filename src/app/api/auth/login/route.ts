import { cookies } from "next/headers";
import { getDb } from "@/server/db/client";
import { getSessionCookieOptions, SESSION_COOKIE_NAME } from "@/server/auth/guards";
import { login } from "@/server/auth/service";
import { loginSchema } from "@/server/auth/schemas";
import { toErrorResponse } from "@/server/lib/errors";
import { jsonSuccess, parseBody } from "@/server/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const input = await parseBody(request, loginSchema);
    const { user, token } = await login(input, { db: getDb() });

    (await cookies()).set(SESSION_COOKIE_NAME, token, getSessionCookieOptions());
    return jsonSuccess(user, 200, "Sesión iniciada");
  } catch (error) {
    return toErrorResponse(error);
  }
}

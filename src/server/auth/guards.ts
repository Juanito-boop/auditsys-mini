import "server-only";

import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME } from "@/server/lib/constants";
import { forbidden, unauthorized } from "@/server/lib/errors";
import type { Actor } from "@/shared/types";
import { verifyToken } from "./service";

export { SESSION_COOKIE_NAME } from "@/server/lib/constants";
export { getSessionCookieOptions } from "./service";

/** Autoridad real: valida el JWT de la cookie en cada petición. */
export async function requireUser(): Promise<Actor> {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  if (!token) throw unauthorized("Debes iniciar sesión para continuar");

  const actor = await verifyToken(token);
  if (!actor) throw unauthorized("Debes iniciar sesión para continuar");
  return actor;
}

/** Igual que requireUser, pero exige el rol de administrador. */
export async function requireAdmin(): Promise<Actor> {
  const actor = await requireUser();
  if (actor.role !== "admin") {
    throw forbidden("Esta acción requiere el rol de administrador");
  }
  return actor;
}

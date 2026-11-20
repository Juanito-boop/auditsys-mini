import "server-only";

import { cookies } from "next/headers";
import { getDb } from "@/server/db/client";
import type { UserRow } from "@/server/db/types";
import { SESSION_COOKIE_NAME } from "@/server/lib/constants";
import { forbidden, unauthorized } from "@/server/lib/errors";
import type { Actor } from "@/shared/types";
import { verifyToken } from "./service";

export { SESSION_COOKIE_NAME } from "@/server/lib/constants";
export { getSessionCookieOptions } from "./service";

/** Autoridad real: valida el JWT y revalida al usuario vigente en la BD en cada petición. */
export async function requireUser(): Promise<Actor> {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  if (!token) throw unauthorized("Debes iniciar sesión para continuar");

  const claims = await verifyToken(token);
  if (!claims) throw unauthorized("Debes iniciar sesión para continuar");

  const fila = getDb()
    .prepare("SELECT id, name, email, role FROM users WHERE id = ?")
    .get(claims.id) as Pick<UserRow, "id" | "name" | "email" | "role"> | undefined;
  if (!fila) throw unauthorized("Debes iniciar sesión para continuar");

  // La BD manda: ni el nombre, el correo ni el rol del JWT se consideran vigentes.
  return { id: fila.id, name: fila.name, email: fila.email, role: fila.role };
}

/** Igual que requireUser, pero exige el rol de administrador. */
export async function requireAdmin(): Promise<Actor> {
  const actor = await requireUser();
  if (actor.role !== "admin") {
    throw forbidden("Esta acción requiere el rol de administrador");
  }
  return actor;
}

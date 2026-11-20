/** Contexto de ejecución de los servicios: dependencias inyectadas, sin next/headers. */

import type { Db } from "@/server/db/client";
import type { Actor } from "@/shared/types";

export interface ServiceContext {
  db: Db;
  actor: Actor;
  /** Permite fijar la fecha en tests. Devuelve un ISO string. */
  now?: () => string;
}

export interface OperacionExitosa {
  ok: true;
  id: number;
}

export function nowIso(ctx: ServiceContext): string {
  return ctx.now?.() ?? new Date().toISOString();
}

/**
 * La columna `evaluated_at` exige estrictamente AAAA-MM-DD (CHECK con GLOB),
 * así que se recorta la fecha del ISO antes de persistir.
 */
export function fechaIso(ctx: ServiceContext): string {
  return nowIso(ctx).slice(0, 10);
}

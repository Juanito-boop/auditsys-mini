import "server-only";

import { assertAuditAccess } from "@/server/auth/scope";
import type { Db } from "@/server/db/client";
import type { PrintRequestRow } from "@/server/db/types";
import { nowIso, type ServiceContext } from "@/server/lib/context";
import { conflict } from "@/server/lib/errors";
import { toPrintRequestDTO } from "@/server/lib/serializers";
import type {
  PrintRequestDTO,
  PrintRequestOrigin,
  PrintRequestPorUsuarioDTO,
  PrintRequestsDTO,
} from "@/shared/types";
import type { PrintRequestCreateInput } from "./schemas";

const BUSCAR_POR_CLAVE =
  "SELECT * FROM report_print_requests WHERE audit_id = ? AND user_id = ? AND request_key = ?";
const BUSCAR_POR_ID = "SELECT * FROM report_print_requests WHERE id = ?";
const INSERTAR = `INSERT INTO report_print_requests
  (audit_id, user_id, requested_at, user_name_snapshot, user_email_snapshot, origin, request_key)
  VALUES (@audit_id, @user_id, @requested_at, @user_name_snapshot, @user_email_snapshot, @origin, @request_key)`;
const CONTAR = "SELECT COUNT(*) AS total FROM report_print_requests WHERE audit_id = ?";
const LISTAR = `SELECT * FROM report_print_requests
  WHERE audit_id = ? ORDER BY requested_at DESC, id DESC LIMIT 50`;
/** Agrega toda la auditoría en SQL; rn=1 conserva el snapshot de la solicitud más reciente. */
const AGRUPAR = `
  WITH ordenadas AS (
    SELECT user_id,
           user_name_snapshot,
           user_email_snapshot,
           requested_at,
           ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY requested_at DESC, id DESC) AS rn,
           COUNT(*) OVER (PARTITION BY user_id) AS total
      FROM report_print_requests
     WHERE audit_id = ?
  )
  SELECT user_id AS userId,
         user_name_snapshot AS userName,
         user_email_snapshot AS userEmail,
         total,
         requested_at AS ultimaSolicitudEn
    FROM ordenadas
   WHERE rn = 1
   ORDER BY total DESC, userId ASC
`;

type FilaPorUsuario = {
  userId: number;
  userName: string;
  userEmail: string;
  total: number;
  ultimaSolicitudEn: string;
};

function leerPorClave(
  db: Db,
  auditId: number,
  userId: number,
  requestKey: string,
): PrintRequestRow | undefined {
  return db.prepare(BUSCAR_POR_CLAVE).get(auditId, userId, requestKey) as PrintRequestRow | undefined;
}

function verificarOrigen(fila: PrintRequestRow, origin: PrintRequestOrigin): void {
  if (fila.origin !== origin) {
    throw conflict("La clave de solicitud ya está registrada con otro origen.");
  }
}

/** better-sqlite3 distingue las violaciones de UNIQUE mediante el código de error. */
function esViolacionUnica(error: unknown): boolean {
  if (typeof error !== "object" || error === null || !("code" in error)) return false;
  return (
    error.code === "SQLITE_CONSTRAINT_UNIQUE" || error.code === "SQLITE_CONSTRAINT_PRIMARYKEY"
  );
}

/**
 * Registra la intención de imprimir/descargar el informe. La identidad y los snapshots
 * salen siempre del actor revalidado; el body solo aporta el origen y la clave idempotente.
 */
export function registerPrintRequest(
  ctx: ServiceContext,
  auditId: number,
  input: PrintRequestCreateInput,
): { dto: PrintRequestDTO; created: boolean } {
  // Las auditorías cerradas pueden consultarse e imprimirse: no se aplica assertOpen.
  assertAuditAccess(ctx, auditId);

  const puedeVerEmail = ctx.actor.role === "admin";
  const userId = ctx.actor.id;
  const existente = leerPorClave(ctx.db, auditId, userId, input.requestKey);
  if (existente) {
    verificarOrigen(existente, input.origin);
    return { dto: toPrintRequestDTO(existente, puedeVerEmail), created: false };
  }

  try {
    const resultado = ctx.db.prepare(INSERTAR).run({
      audit_id: auditId,
      user_id: userId,
      requested_at: nowIso(ctx),
      user_name_snapshot: ctx.actor.name,
      user_email_snapshot: ctx.actor.email,
      origin: input.origin,
      request_key: input.requestKey,
    });
    const fila = ctx.db.prepare(BUSCAR_POR_ID).get(resultado.lastInsertRowid) as PrintRequestRow;
    return { dto: toPrintRequestDTO(fila, puedeVerEmail), created: true };
  } catch (error) {
    if (!esViolacionUnica(error)) throw error;

    // Otra petición insertó la misma clave entre la lectura y la inserción: es un replay.
    const ganador = leerPorClave(ctx.db, auditId, userId, input.requestKey);
    if (!ganador) throw error;
    verificarOrigen(ganador, input.origin);
    return { dto: toPrintRequestDTO(ganador, puedeVerEmail), created: false };
  }
}

/** Devuelve las 50 solicitudes más recientes; totales y agrupación abarcan todas las filas. */
export function listPrintRequests(ctx: ServiceContext, auditId: number): PrintRequestsDTO {
  assertAuditAccess(ctx, auditId);

  const puedeVerEmail = ctx.actor.role === "admin";
  const total = (ctx.db.prepare(CONTAR).get(auditId) as { total: number }).total;
  const filas = ctx.db.prepare(LISTAR).all(auditId) as PrintRequestRow[];
  const filasPorUsuario = ctx.db.prepare(AGRUPAR).all(auditId) as FilaPorUsuario[];
  const porUsuario: PrintRequestPorUsuarioDTO[] = filasPorUsuario.map((fila) => ({
    userId: fila.userId,
    userName: fila.userName,
    userEmail: puedeVerEmail ? fila.userEmail : null,
    total: fila.total,
    ultimaSolicitudEn: fila.ultimaSolicitudEn,
  }));

  return {
    auditId,
    total,
    solicitudes: filas.map((fila) => toPrintRequestDTO(fila, puedeVerEmail)),
    porUsuario,
  };
}

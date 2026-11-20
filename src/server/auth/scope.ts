import "server-only";

import type { Db } from "@/server/db/client";
import type { AuditRow } from "@/server/db/types";
import { conflict, forbidden, notFound } from "@/server/lib/errors";
import type { Actor, AuditStatus } from "@/shared/types";

/** Un auditor solo ve sus auditorías; un administrador ve todas. */
export function assertAuditAccess(
  ctx: { db: Db; actor: Actor },
  auditId: number
): AuditRow {
  const audit = ctx.db.prepare("SELECT * FROM audits WHERE id = ?").get(auditId) as
    | AuditRow
    | undefined;

  if (!audit) throw notFound("Auditoría no encontrada");
  if (ctx.actor.role !== "admin" && audit.auditor_id !== ctx.actor.id) {
    throw forbidden("No tienes acceso a esta auditoría");
  }
  return audit;
}

/** Las auditorías cerradas son de solo lectura. */
export function assertOpen(audit: AuditRow | { status: AuditStatus }): void {
  if (audit.status === "cerrada") {
    throw conflict("La auditoría está cerrada y es de solo lectura");
  }
}

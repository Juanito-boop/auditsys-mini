import "server-only";

import { assertAuditAccess, assertOpen } from "@/server/auth/scope";
import type { AuditControlRow, AuditRow } from "@/server/db/types";
import { badRequest, conflict } from "@/server/lib/errors";
import type { ServiceContext } from "@/server/lib/context";
import { progressFor, toAuditControlDTO, toAuditDTO } from "@/server/lib/serializers";
import type { AuditControlDTO, AuditDTO, AuditDetailDTO, AuditStatus } from "@/shared/types";
import type {
  AuditCreateInput,
  AuditStatusInput,
  AuditUpdateInput,
} from "./schemas";

export function getAudit(ctx: ServiceContext, id: number): AuditDTO {
  return toAuditDTO(ctx.db, assertAuditAccess(ctx, id));
}

export function listAudits(ctx: ServiceContext, status?: AuditStatus): AuditDTO[] {
  const condiciones: string[] = [];
  const parametros: Array<string | number> = [];

  if (ctx.actor.role !== "admin") {
    condiciones.push("auditor_id = ?");
    parametros.push(ctx.actor.id);
  }
  if (status) {
    condiciones.push("status = ?");
    parametros.push(status);
  }

  const where = condiciones.length ? `WHERE ${condiciones.join(" AND ")}` : "";
  const filas = ctx.db
    .prepare(`SELECT * FROM audits ${where} ORDER BY id DESC`)
    .all(...parametros) as AuditRow[];

  const nombres = new Map<number, string>();
  for (const fila of filas) {
    if (!nombres.has(fila.auditor_id)) {
      const usuario = ctx.db
        .prepare("SELECT name FROM users WHERE id = ?")
        .get(fila.auditor_id) as { name: string } | undefined;
      nombres.set(fila.auditor_id, usuario?.name ?? "");
    }
  }

  return filas.map((fila) => toAuditDTO(ctx.db, fila, nombres.get(fila.auditor_id)));
}

/** Crea la auditoría y una fila pendiente por cada control activo del catálogo. */
export function createAudit(ctx: ServiceContext, input: AuditCreateInput): AuditDTO {
  const auditorId = ctx.actor.role === "admin" && input.auditor_id ? input.auditor_id : ctx.actor.id;
  const existeAuditor = ctx.db.prepare("SELECT 1 FROM users WHERE id = ?").get(auditorId);
  if (!existeAuditor) throw badRequest("El auditor indicado no existe.");

  const id = ctx.db.transaction(() => {
    const resultado = ctx.db
      .prepare(
        `INSERT INTO audits (organization, objective, scope, audit_date, auditor_id, status)
         VALUES (@organization, @objective, @scope, @audit_date, @auditor_id, @status)`,
      )
      .run({
        organization: input.organization,
        objective: input.objective,
        scope: input.scope,
        audit_date: input.audit_date,
        auditor_id: auditorId,
        status: input.status ?? "borrador",
      });

    const auditoriaId = Number(resultado.lastInsertRowid);
    const controles = ctx.db
      .prepare("SELECT id FROM controls WHERE active = 1 ORDER BY id")
      .all() as Array<{ id: number }>;
    const insertar = ctx.db.prepare(
      `INSERT INTO audit_controls (audit_id, control_id, status, observations, na_justification, evaluated_at)
       VALUES (?, ?, 'pendiente', '', NULL, NULL)`,
    );
    for (const control of controles) insertar.run(auditoriaId, control.id);

    return auditoriaId;
  })();

  return getAudit(ctx, id);
}

export function getAuditDetail(ctx: ServiceContext, id: number): AuditDetailDTO {
  const audit = assertAuditAccess(ctx, id);
  const filas = ctx.db
    .prepare("SELECT * FROM audit_controls WHERE audit_id = ? ORDER BY id")
    .all(id) as AuditControlRow[];
  const controls: AuditControlDTO[] = filas.map((fila) => toAuditControlDTO(ctx.db, fila));

  const evidencias = ctx.db
    .prepare(
      `SELECT COUNT(*) AS total FROM evidences e
       JOIN audit_controls ac ON ac.id = e.audit_control_id WHERE ac.audit_id = ?`,
    )
    .get(id) as { total: number };
  const hallazgos = ctx.db
    .prepare("SELECT COUNT(*) AS total FROM findings WHERE audit_id = ?")
    .get(id) as { total: number };

  return {
    ...toAuditDTO(ctx.db, audit),
    controls,
    totalEvidencias: evidencias.total,
    totalHallazgos: hallazgos.total,
  };
}

export function updateAudit(ctx: ServiceContext, id: number, input: AuditUpdateInput): AuditDTO {
  const audit = assertAuditAccess(ctx, id);
  assertOpen(audit);

  ctx.db
    .prepare(
      `UPDATE audits SET organization = ?, objective = ?, scope = ?, audit_date = ? WHERE id = ?`,
    )
    .run(input.organization, input.objective, input.scope, input.audit_date, id);

  return getAudit(ctx, id);
}

export function updateAuditStatus(
  ctx: ServiceContext,
  id: number,
  input: AuditStatusInput,
): AuditDTO {
  const audit = assertAuditAccess(ctx, id);
  assertOpen(audit);

  if (input.status === "cerrada" && progressFor(ctx.db, id).pendientes > 0) {
    throw conflict("No se puede cerrar la auditoría mientras haya controles pendientes de evaluar.");
  }

  ctx.db.prepare("UPDATE audits SET status = ? WHERE id = ?").run(input.status, id);
  return getAudit(ctx, id);
}

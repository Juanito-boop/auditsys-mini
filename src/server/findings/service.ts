import "server-only";

import { assertAuditAccess, assertOpen } from "@/server/auth/scope";
import type {
  AuditControlRow,
  FindingRow,
  RecommendationRow,
} from "@/server/db/types";
import type { ServiceContext } from "@/server/lib/context";
import { badRequest, conflict, notFound } from "@/server/lib/errors";
import { toFindingDTO, toRecommendationDTO } from "@/server/lib/serializers";
import type { FindingDTO, RecommendationDTO } from "@/shared/types";
import type {
  FindingCreateInput,
  RecommendationCreateInput,
  RecommendationUpdateInput,
} from "./schemas";

function findingPorId(ctx: ServiceContext, id: number): FindingRow {
  const fila = ctx.db.prepare("SELECT * FROM findings WHERE id = ?").get(id) as FindingRow | undefined;
  if (!fila) throw notFound("Hallazgo no encontrado");
  return fila;
}

function validarControlDelHallazgo(
  ctx: ServiceContext,
  auditId: number,
  auditControlId: number,
): void {
  const control = ctx.db
    .prepare("SELECT * FROM audit_controls WHERE id = ? AND audit_id = ?")
    .get(auditControlId, auditId) as AuditControlRow | undefined;
  if (!control) throw notFound("El control no pertenece a esta auditoría.");

  if (
    control.status !== "parcialmente_implementado" &&
    control.status !== "no_implementado"
  ) {
    throw conflict(
      "Solo se pueden registrar hallazgos sobre controles parcialmente implementados o no implementados.",
    );
  }
}

export function listFindings(ctx: ServiceContext, auditId: number): FindingDTO[] {
  assertAuditAccess(ctx, auditId);
  const filas = ctx.db
    .prepare("SELECT * FROM findings WHERE audit_id = ? ORDER BY id")
    .all(auditId) as FindingRow[];
  return filas.map((fila) => toFindingDTO(ctx.db, fila));
}

export function createFinding(
  ctx: ServiceContext,
  auditId: number,
  input: FindingCreateInput,
): FindingDTO {
  const audit = assertAuditAccess(ctx, auditId);
  assertOpen(audit);
  validarControlDelHallazgo(ctx, auditId, input.audit_control_id);

  const resultado = ctx.db
    .prepare(
      `INSERT INTO findings (audit_control_id, audit_id, condition, criterion, cause, effect_risk, severity)
       VALUES (@audit_control_id, @audit_id, @condition, @criterion, @cause, @effect_risk, @severity)`,
    )
    .run({ ...input, audit_id: auditId });

  const fila = findingPorId(ctx, Number(resultado.lastInsertRowid));
  return toFindingDTO(ctx.db, fila);
}

export function updateFinding(
  ctx: ServiceContext,
  id: number,
  input: FindingCreateInput,
): FindingDTO {
  const fila = findingPorId(ctx, id);
  const audit = assertAuditAccess(ctx, fila.audit_id);
  assertOpen(audit);
  validarControlDelHallazgo(ctx, audit.id, input.audit_control_id);

  ctx.db
    .prepare(
      `UPDATE findings
          SET audit_control_id = @audit_control_id, condition = @condition, criterion = @criterion,
              cause = @cause, effect_risk = @effect_risk, severity = @severity
        WHERE id = @id`,
    )
    .run({ ...input, id });

  return toFindingDTO(ctx.db, findingPorId(ctx, id));
}

export function deleteFinding(ctx: ServiceContext, id: number): { ok: true; id: number } {
  const fila = findingPorId(ctx, id);
  assertOpen(assertAuditAccess(ctx, fila.audit_id));
  ctx.db.prepare("DELETE FROM findings WHERE id = ?").run(id);
  return { ok: true, id };
}

function recomendacionConAuditoria(
  ctx: ServiceContext,
  id: number,
): RecommendationRow & { owner_audit_id: number } {
  const fila = ctx.db
    .prepare(
      `SELECT r.*, f.audit_id AS owner_audit_id
         FROM recommendations r
         JOIN findings f ON f.id = r.finding_id
        WHERE r.id = ?`,
    )
    .get(id) as (RecommendationRow & { owner_audit_id: number }) | undefined;
  if (!fila) throw notFound("Recomendación no encontrada");
  return fila;
}

export function createRecommendation(
  ctx: ServiceContext,
  findingId: number,
  input: RecommendationCreateInput,
): RecommendationDTO {
  const hallazgo = findingPorId(ctx, findingId);
  assertOpen(assertAuditAccess(ctx, hallazgo.audit_id));

  const resultado = ctx.db
    .prepare(
      "INSERT INTO recommendations (finding_id, description, priority) VALUES (?, ?, ?)",
    )
    .run(findingId, input.description, input.priority);

  const fila = ctx.db
    .prepare("SELECT * FROM recommendations WHERE id = ?")
    .get(resultado.lastInsertRowid) as RecommendationRow;
  return toRecommendationDTO(fila);
}

export function updateRecommendation(
  ctx: ServiceContext,
  id: number,
  input: RecommendationUpdateInput,
): RecommendationDTO {
  const fila = recomendacionConAuditoria(ctx, id);
  assertOpen(assertAuditAccess(ctx, fila.owner_audit_id));

  const asignaciones: string[] = [];
  const valores: Array<string | number> = [];
  if (input.description !== undefined) {
    asignaciones.push("description = ?");
    valores.push(input.description);
  }
  if (input.priority !== undefined) {
    asignaciones.push("priority = ?");
    valores.push(input.priority);
  }
  if (!asignaciones.length) {
    throw badRequest("Debes enviar al menos la descripción o la prioridad.");
  }

  ctx.db
    .prepare(`UPDATE recommendations SET ${asignaciones.join(", ")} WHERE id = ?`)
    .run(...valores, id);

  const actualizada = ctx.db
    .prepare("SELECT * FROM recommendations WHERE id = ?")
    .get(id) as RecommendationRow;
  return toRecommendationDTO(actualizada);
}

export function deleteRecommendation(ctx: ServiceContext, id: number): { ok: true; id: number } {
  const fila = recomendacionConAuditoria(ctx, id);
  assertOpen(assertAuditAccess(ctx, fila.owner_audit_id));
  ctx.db.prepare("DELETE FROM recommendations WHERE id = ?").run(id);
  return { ok: true, id };
}

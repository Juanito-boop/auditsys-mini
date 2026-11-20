import "server-only";

import { assertAuditAccess, assertOpen } from "@/server/auth/scope";
import type { EvidenceRow } from "@/server/db/types";
import { findAuditControl } from "@/server/evaluations/service";
import type { ServiceContext } from "@/server/lib/context";
import { notFound } from "@/server/lib/errors";
import { toEvidenceDTO } from "@/server/lib/serializers";
import type { EvidenceDTO } from "@/shared/types";
import type { EvidenceCreateInput } from "./schemas";

export function listEvidences(
  ctx: ServiceContext,
  auditId: number,
  controlId: number,
): EvidenceDTO[] {
  assertAuditAccess(ctx, auditId);
  const control = findAuditControl(ctx, auditId, controlId);

  const filas = ctx.db
    .prepare("SELECT * FROM evidences WHERE audit_control_id = ? ORDER BY id")
    .all(control.id) as EvidenceRow[];
  return filas.map(toEvidenceDTO);
}

export function createEvidence(
  ctx: ServiceContext,
  auditId: number,
  controlId: number,
  input: EvidenceCreateInput,
): EvidenceDTO {
  const audit = assertAuditAccess(ctx, auditId);
  assertOpen(audit);
  const control = findAuditControl(ctx, auditId, controlId);

  const resultado = ctx.db
    .prepare(
      `INSERT INTO evidences (audit_control_id, description, source, evidence_date, reference, is_simulated)
       VALUES (@audit_control_id, @description, @source, @evidence_date, @reference, @is_simulated)`,
    )
    .run({
      audit_control_id: control.id,
      description: input.description,
      source: input.source,
      evidence_date: input.evidence_date,
      reference: input.reference,
      is_simulated: input.is_simulated ? 1 : 0,
    });

  const fila = ctx.db
    .prepare("SELECT * FROM evidences WHERE id = ?")
    .get(resultado.lastInsertRowid) as EvidenceRow;
  return toEvidenceDTO(fila);
}

/** Resuelve la auditoría dueña mediante join para no fiarse del id del cliente. */
export function deleteEvidence(ctx: ServiceContext, id: number): { ok: true; id: number } {
  const fila = ctx.db
    .prepare(
      `SELECT e.*, ac.audit_id AS owner_audit_id
         FROM evidences e
         JOIN audit_controls ac ON ac.id = e.audit_control_id
        WHERE e.id = ?`,
    )
    .get(id) as (EvidenceRow & { owner_audit_id: number }) | undefined;
  if (!fila) throw notFound("Evidencia no encontrada");

  const audit = assertAuditAccess(ctx, fila.owner_audit_id);
  assertOpen(audit);

  ctx.db.prepare("DELETE FROM evidences WHERE id = ?").run(id);
  return { ok: true, id };
}

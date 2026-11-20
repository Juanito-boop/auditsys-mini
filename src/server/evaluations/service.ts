import "server-only";

import { assertAuditAccess, assertOpen } from "@/server/auth/scope";
import type { AuditControlRow } from "@/server/db/types";
import { badRequest, notFound } from "@/server/lib/errors";
import { fechaIso, type ServiceContext } from "@/server/lib/context";
import { toAuditControlDTO } from "@/server/lib/serializers";
import type { AuditControlDTO, ControlStatus } from "@/shared/types";
import type { EvaluationUpdateInput } from "./schemas";

/**
 * El parámetro `controlId` acepta tanto el id de la fila de auditoría-control
 * como el id del control del catálogo; ambos son útiles según quién llame.
 */
export function findAuditControl(
  ctx: ServiceContext,
  auditId: number,
  identificador: number,
): AuditControlRow {
  const porFila = ctx.db
    .prepare("SELECT * FROM audit_controls WHERE audit_id = ? AND id = ?")
    .get(auditId, identificador) as AuditControlRow | undefined;
  if (porFila) return porFila;

  const porControl = ctx.db
    .prepare("SELECT * FROM audit_controls WHERE audit_id = ? AND control_id = ?")
    .get(auditId, identificador) as AuditControlRow | undefined;
  if (porControl) return porControl;

  throw notFound("El control no pertenece a esta auditoría.");
}

export function listEvaluations(
  ctx: ServiceContext,
  auditId: number,
  status?: ControlStatus,
): AuditControlDTO[] {
  assertAuditAccess(ctx, auditId);

  const filas = status
    ? (ctx.db
        .prepare("SELECT * FROM audit_controls WHERE audit_id = ? AND status = ? ORDER BY id")
        .all(auditId, status) as AuditControlRow[])
    : (ctx.db
        .prepare("SELECT * FROM audit_controls WHERE audit_id = ? ORDER BY id")
        .all(auditId) as AuditControlRow[]);

  return filas.map((fila) => toAuditControlDTO(ctx.db, fila));
}

export function evaluateControl(
  ctx: ServiceContext,
  auditId: number,
  controlId: number,
  input: EvaluationUpdateInput,
): AuditControlDTO {
  const audit = assertAuditAccess(ctx, auditId);
  assertOpen(audit);
  const fila = findAuditControl(ctx, auditId, controlId);

  let observaciones = input.observations === undefined ? fila.observations : input.observations.trim();
  let justificacion: string | null = null;
  let evaluadoEn: string | null = fechaIso(ctx);

  if (input.status === "pendiente") {
    observaciones = "";
    justificacion = null;
    evaluadoEn = null;
  } else if (input.status === "no_aplicable") {
    justificacion = input.na_justification?.trim() ?? "";
    if (!justificacion) {
      throw badRequest("La justificación es obligatoria cuando el control se marca como no aplicable.", [
        { path: "na_justification", message: "Introduce una justificación no vacía." },
      ]);
    }
  }

  ctx.db
    .prepare(
      `UPDATE audit_controls
          SET status = ?, observations = ?, na_justification = ?, evaluated_at = ?
        WHERE id = ?`,
    )
    .run(input.status, observaciones, justificacion, evaluadoEn, fila.id);

  const actualizada = ctx.db
    .prepare("SELECT * FROM audit_controls WHERE id = ?")
    .get(fila.id) as AuditControlRow;
  return toAuditControlDTO(ctx.db, actualizada);
}

/**
 * Traducción de filas SQLite a DTOs compartidos. Helpers puros de presentación de datos:
 * la lógica de negocio vive en los servicios de cada módulo.
 */

import type { Db } from "@/server/db/client";
import type {
  AuditControlRow,
  AuditRow,
  ControlRow,
  EvidenceRow,
  FindingRow,
  PrintRequestRow,
  RecommendationRow,
} from "@/server/db/types";
import { notFound } from "@/server/lib/errors";
import type {
  AuditControlDTO,
  AuditDTO,
  ControlDTO,
  EvidenceDTO,
  FindingDTO,
  PrintRequestDTO,
  RecommendationDTO,
  Severity,
} from "@/shared/types";

const SEVERIDADES: readonly Severity[] = ["baja", "media", "alta", "critica"];

export interface Progress {
  total: number;
  evaluados: number;
  pendientes: number;
}

export function progressFor(db: Db, auditId: number): Progress {
  return db
    .prepare(
      `SELECT COUNT(*) AS total,
              COALESCE(SUM(CASE WHEN status <> 'pendiente' THEN 1 ELSE 0 END), 0) AS evaluados,
              COALESCE(SUM(CASE WHEN status = 'pendiente' THEN 1 ELSE 0 END), 0) AS pendientes
         FROM audit_controls WHERE audit_id = ?`,
    )
    .get(auditId) as Progress;
}

export function toControlDTO(fila: ControlRow): ControlDTO {
  return {
    id: fila.id,
    code: fila.code,
    name: fila.name,
    description: fila.description,
    criterion: fila.criterion,
    source: fila.source,
    theme: fila.theme,
    active: fila.active === 1,
    created_at: fila.created_at,
  };
}

export function toAuditDTO(db: Db, fila: AuditRow, auditorName?: string): AuditDTO {
  const nombre =
    auditorName ??
    (db.prepare("SELECT name FROM users WHERE id = ?").get(fila.auditor_id) as { name: string } | undefined)
      ?.name ??
    "";

  return {
    id: fila.id,
    organization: fila.organization,
    objective: fila.objective,
    scope: fila.scope,
    audit_date: fila.audit_date,
    auditor_id: fila.auditor_id,
    auditor_name: nombre,
    status: fila.status,
    created_at: fila.created_at,
    progress: progressFor(db, fila.id),
  };
}

export function toAuditControlDTO(db: Db, fila: AuditControlRow): AuditControlDTO {
  const control = db.prepare("SELECT * FROM controls WHERE id = ?").get(fila.control_id) as
    | ControlRow
    | undefined;
  if (!control) throw notFound("Control no encontrado");

  const evidencias = db
    .prepare("SELECT COUNT(*) AS total FROM evidences WHERE audit_control_id = ?")
    .get(fila.id) as { total: number };

  const hallazgos = db
    .prepare(
      `SELECT COUNT(*) AS total,
              MAX(CASE severity WHEN 'baja' THEN 1 WHEN 'media' THEN 2 WHEN 'alta' THEN 3 WHEN 'critica' THEN 4 ELSE 0 END) AS nivel
         FROM findings WHERE audit_control_id = ?`,
    )
    .get(fila.id) as { total: number; nivel: number | null };

  return {
    id: fila.id,
    audit_id: fila.audit_id,
    control_id: fila.control_id,
    status: fila.status,
    observations: fila.observations,
    na_justification: fila.na_justification,
    evaluated_at: fila.evaluated_at,
    created_at: fila.created_at,
    control: toControlDTO(control),
    evidenciaCount: evidencias.total,
    hallazgoCount: hallazgos.total,
    maxSeverity: hallazgos.nivel === null ? null : (SEVERIDADES[hallazgos.nivel - 1] ?? null),
  };
}

export function toEvidenceDTO(fila: EvidenceRow): EvidenceDTO {
  return {
    id: fila.id,
    audit_control_id: fila.audit_control_id,
    description: fila.description,
    source: fila.source,
    evidence_date: fila.evidence_date,
    reference: fila.reference,
    is_simulated: fila.is_simulated === 1,
    created_at: fila.created_at,
  };
}

export function toRecommendationDTO(fila: RecommendationRow): RecommendationDTO {
  return {
    id: fila.id,
    finding_id: fila.finding_id,
    description: fila.description,
    priority: fila.priority,
    created_at: fila.created_at,
  };
}

export function toFindingDTO(db: Db, fila: FindingRow): FindingDTO {
  const control = db
    .prepare(
      `SELECT c.id, c.code, c.name
         FROM controls c
         JOIN audit_controls ac ON ac.control_id = c.id
        WHERE ac.id = ?`,
    )
    .get(fila.audit_control_id) as Pick<ControlDTO, "id" | "code" | "name"> | undefined;
  if (!control) throw notFound("Control del hallazgo no encontrado");

  const recomendaciones = db
    .prepare("SELECT * FROM recommendations WHERE finding_id = ? ORDER BY id")
    .all(fila.id) as RecommendationRow[];

  return {
    id: fila.id,
    audit_id: fila.audit_id,
    audit_control_id: fila.audit_control_id,
    control,
    condition: fila.condition,
    criterion: fila.criterion,
    cause: fila.cause,
    effect_risk: fila.effect_risk,
    severity: fila.severity,
    created_at: fila.created_at,
    recommendations: recomendaciones.map(toRecommendationDTO),
    warningSinRecomendacion: recomendaciones.length === 0,
  };
}

/** `puedeVerEmail` depende del rol del actor: los auditores solo ven el snapshot de nombre. */
export function toPrintRequestDTO(fila: PrintRequestRow, puedeVerEmail: boolean): PrintRequestDTO {
  return {
    id: fila.id,
    auditId: fila.audit_id,
    userId: fila.user_id,
    userName: fila.user_name_snapshot,
    userEmail: puedeVerEmail ? fila.user_email_snapshot : null,
    requestedAt: fila.requested_at,
    origin: fila.origin,
  };
}

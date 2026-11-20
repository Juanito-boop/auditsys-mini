import "server-only";

import { assertAuditAccess } from "@/server/auth/scope";
import type { AuditControlRow, EvidenceRow, FindingRow } from "@/server/db/types";
import { nowIso, type ServiceContext } from "@/server/lib/context";
import { AVISO_NO_CERTIFICA, METODOLOGIA, REFERENTES } from "@/server/lib/constants";
import { LIMITACIONES } from "@/shared/constants";
import { calculateIndicators } from "@/server/lib/compliance";
import { toAuditControlDTO, toAuditDTO, toEvidenceDTO, toFindingDTO } from "@/server/lib/serializers";
import type { ControlStatus, ReportDTO, ResultsDTO, Severity, Theme } from "@/shared/types";

const ESTADOS: readonly ControlStatus[] = [
  "pendiente",
  "implementado",
  "parcialmente_implementado",
  "no_implementado",
  "no_aplicable",
];
const SEVERIDADES: readonly Severity[] = ["baja", "media", "alta", "critica"];
const TEMAS: readonly Theme[] = ["Organizacional", "Personas", "Físico", "Tecnológico"];

function total(db: ServiceContext["db"], sql: string, id: number): number {
  return (db.prepare(sql).get(id) as { total: number }).total;
}

/** Construye los resultados siempre desde la base de datos, nunca desde un estado previo. */
export function getResults(ctx: ServiceContext, auditId: number): ResultsDTO {
  const db = ctx.db;
  const audit = assertAuditAccess(ctx, auditId);
  const base = toAuditDTO(db, audit);

  const filas = db
    .prepare("SELECT * FROM audit_controls WHERE audit_id = ? ORDER BY id")
    .all(auditId) as AuditControlRow[];
  const hallazgosFilas = db
    .prepare("SELECT * FROM findings WHERE audit_id = ? ORDER BY id")
    .all(auditId) as FindingRow[];

  const porEstadoMap = new Map<ControlStatus, number>(ESTADOS.map((estado) => [estado, 0]));
  for (const fila of filas) porEstadoMap.set(fila.status, (porEstadoMap.get(fila.status) ?? 0) + 1);

  const counts = {
    totalControles: filas.length,
    evaluados: filas.filter((fila) => fila.status !== "pendiente").length,
    pendientes: porEstadoMap.get("pendiente") ?? 0,
    noAplicables: porEstadoMap.get("no_aplicable") ?? 0,
    implementados: porEstadoMap.get("implementado") ?? 0,
    parcialmenteImplementados: porEstadoMap.get("parcialmente_implementado") ?? 0,
    noImplementados: porEstadoMap.get("no_implementado") ?? 0,
    evidencias: total(
      db,
      `SELECT COUNT(*) AS total FROM evidences e
        JOIN audit_controls ac ON ac.id = e.audit_control_id WHERE ac.audit_id = ?`,
      auditId,
    ),
    hallazgos: hallazgosFilas.length,
    recomendaciones: total(
      db,
      `SELECT COUNT(*) AS total FROM recommendations r
        JOIN findings f ON f.id = r.finding_id WHERE f.audit_id = ?`,
      auditId,
    ),
    hallazgosSinRecomendacion: total(
      db,
      `SELECT COUNT(*) AS total FROM findings f
        WHERE f.audit_id = ? AND NOT EXISTS (SELECT 1 FROM recommendations r WHERE r.finding_id = f.id)`,
      auditId,
    ),
  };

  const detallePorControl = filas.map((fila) => {
    const evidencias = db
      .prepare("SELECT * FROM evidences WHERE audit_control_id = ? ORDER BY id")
      .all(fila.id) as EvidenceRow[];
    const hallazgos = hallazgosFilas.filter((h) => h.audit_control_id === fila.id);

    return {
      auditControl: toAuditControlDTO(db, fila),
      evidencias: evidencias.map(toEvidenceDTO),
      hallazgos: hallazgos.map((h) => toFindingDTO(db, h)),
    };
  });

  const temaPorFila = new Map<number, Theme>();
  for (const [indice, detalle] of detallePorControl.entries()) {
    temaPorFila.set(filas[indice].id, detalle.auditControl.control.theme);
  }

  const trazabilidad = detallePorControl.map((detalle) => ({
    control: {
      id: detalle.auditControl.control.id,
      code: detalle.auditControl.control.code,
      name: detalle.auditControl.control.name,
    },
    status: detalle.auditControl.status,
    evidencias: detalle.evidencias.map((evidencia) => ({
      id: evidencia.id,
      reference: evidencia.reference,
      descripcion: evidencia.description,
      simulada: evidencia.is_simulated,
    })),
    hallazgos: detalle.hallazgos.map((h) => ({
      id: h.id,
      severity: h.severity,
      condition: h.condition,
    })),
    recomendaciones: detalle.hallazgos.flatMap((h) =>
      h.recommendations.map((r) => ({ id: r.id, description: r.description, priority: r.priority })),
    ),
  }));

  const avisos: string[] = [];
  if (counts.pendientes > 0) {
    avisos.push(
      `Hay ${counts.pendientes} controles pendientes de evaluar; no se incluyen en el indicador de cumplimiento.`,
    );
  }
  if (counts.noAplicables > 0) {
    avisos.push(
      `Hay ${counts.noAplicables} controles no aplicables; se excluyen del denominador del indicador.`,
    );
  }
  if (counts.hallazgosSinRecomendacion > 0) {
    const sustantivo = counts.hallazgosSinRecomendacion === 1 ? "hallazgo" : "hallazgos";
    avisos.push(
      `Hay ${counts.hallazgosSinRecomendacion} ${sustantivo} sin recomendación asociada.`,
    );
  }
  avisos.push(...LIMITACIONES);

  return {
    audit: {
      id: base.id,
      organization: base.organization,
      objective: base.objective,
      scope: base.scope,
      audit_date: base.audit_date,
      status: base.status,
      auditor_name: base.auditor_name,
    },
    counts,
    indicators: calculateIndicators(counts),
    porEstado: ESTADOS.map((status) => ({ status, total: porEstadoMap.get(status) ?? 0 })),
    porTema: TEMAS.map((theme) => {
      const delTema = filas.filter((fila) => temaPorFila.get(fila.id) === theme);
      const evaluados = delTema.filter((fila) => fila.status !== "pendiente").length;
      const noAplicables = delTema.filter((fila) => fila.status === "no_aplicable").length;
      const implementados = delTema.filter((fila) => fila.status === "implementado").length;
      const denominador = evaluados - noAplicables;
      return {
        theme,
        evaluados,
        cumplimiento: denominador > 0 ? Math.round((implementados * 1000) / denominador) / 10 : null,
      };
    }),
    porSeveridad: SEVERIDADES.map((severity) => ({
      severity,
      total: hallazgosFilas.filter((h) => h.severity === severity).length,
    })),
    detallePorControl,
    trazabilidad,
    avisos,
  };
}

export function getReport(ctx: ServiceContext, auditId: number): ReportDTO {
  const db = ctx.db;
  const audit = assertAuditAccess(ctx, auditId);
  const resultados = getResults(ctx, auditId);

  const filas = db
    .prepare(
      `SELECT e.*, c.code AS control_code, c.name AS control_name
         FROM evidences e
         JOIN audit_controls ac ON ac.id = e.audit_control_id
         JOIN controls c ON c.id = ac.control_id
        WHERE ac.audit_id = ?
        ORDER BY e.id`,
    )
    .all(auditId) as Array<EvidenceRow & { control_code: string; control_name: string }>;

  return {
    meta: {
      titulo: `Informe de auditoría de seguridad de la información — ${audit.organization}`,
      generadoEn: nowIso(ctx),
      referentes: [...REFERENTES],
      metodologia: METODOLOGIA,
      avisoNoCertifica: AVISO_NO_CERTIFICA,
    },
    portada: {
      organization: audit.organization,
      objective: audit.objective,
      scope: audit.scope,
      audit_date: audit.audit_date,
      auditor: resultados.audit.auditor_name,
      status: audit.status,
      created_at: audit.created_at,
    },
    resultados,
    anexoEvidencias: filas.map((fila) => ({
      ...toEvidenceDTO(fila),
      controlCode: fila.control_code,
      controlName: fila.control_name,
      etiquetaSimulada: fila.is_simulated === 1 ? "Simulada" : null,
    })),
    limitaciones: [...LIMITACIONES],
  };
}

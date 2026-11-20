import "server-only";

import type { AuditRow, AuditControlRow, FindingRow } from "@/server/db/types";
import { calculateIndicators } from "@/server/lib/compliance";
import { LIMITACIONES } from "@/shared/constants";
import { controlStatusValues, auditStatusValues, severityValues } from "@/server/lib/enums";
import type { ServiceContext } from "@/server/lib/context";
import type { ControlStatus, DashboardDTO } from "@/shared/types";

export function getDashboard(ctx: ServiceContext): DashboardDTO {
  const db = ctx.db;
  const auditorias = (
    ctx.actor.role === "admin"
      ? db.prepare("SELECT * FROM audits ORDER BY id DESC").all()
      : db.prepare("SELECT * FROM audits WHERE auditor_id = ? ORDER BY id DESC").all(ctx.actor.id)
  ) as AuditRow[];

  const ids = auditorias.map((a) => a.id);
  const consultar = <T>(sql: string, id: number): T[] =>
    db.prepare(sql).all(id) as T[];

  const filasControl: AuditControlRow[] = [];
  const filasHallazgo: FindingRow[] = [];
  for (const id of ids) {
    filasControl.push(
      ...consultar<AuditControlRow>(
        "SELECT * FROM audit_controls WHERE audit_id = ?",
        id,
      ),
    );
    filasHallazgo.push(
      ...consultar<FindingRow>("SELECT * FROM findings WHERE audit_id = ?", id),
    );
  }

  const estadosAuditorias = new Map<string, number>(
    auditStatusValues.map((estado) => [estado, 0]),
  );
  for (const auditoria of auditorias) {
    estadosAuditorias.set(auditoria.status, (estadosAuditorias.get(auditoria.status) ?? 0) + 1);
  }

  const cumplimientoPorAuditoria = auditorias.map((auditoria) => {
    const filas = filasControl.filter((f) => f.audit_id === auditoria.id);
    const conteo = {
      implementados: filas.filter((f) => f.status === "implementado").length,
      parcialmenteImplementados: filas.filter((f) => f.status === "parcialmente_implementado")
        .length,
      noImplementados: filas.filter((f) => f.status === "no_implementado").length,
      noAplicables: filas.filter((f) => f.status === "no_aplicable").length,
      pendientes: filas.filter((f) => f.status === "pendiente").length,
    };
    const indicadores = calculateIndicators(conteo);
    return {
      id: auditoria.id,
      organization: auditoria.organization,
      status: auditoria.status,
      cumplimiento: indicadores.implementados,
      evaluados: filas.filter((f) => f.status !== "pendiente").length,
      total: filas.length,
    };
  });

  const vigentes = cumplimientoPorAuditoria
    .map((a) => a.cumplimiento)
    .filter((valor): valor is number => valor !== null);
  const cumplimientoPromedio = vigentes.length
    ? Math.round((vigentes.reduce((suma, valor) => suma + valor, 0) / vigentes.length) * 10) / 10
    : null;

  const estadosControl = new Map<ControlStatus, number>(
    controlStatusValues.map((estado) => [estado, 0]),
  );
  for (const fila of filasControl) {
    estadosControl.set(fila.status, (estadosControl.get(fila.status) ?? 0) + 1);
  }

  const severidades = new Map(severityValues.map((s) => [s, 0]));
  for (const hallazgo of filasHallazgo) {
    severidades.set(hallazgo.severity, (severidades.get(hallazgo.severity) ?? 0) + 1);
  }

  let controlesConMasIncumplimientos: DashboardDTO["controlesConMasIncumplimientos"] = [];
  if (ids.length) {
    const marcadores = ids.map(() => "?").join(", ");
    controlesConMasIncumplimientos = db
      .prepare(
        `SELECT c.id AS controlId, c.code, c.name, c.theme,
                COUNT(f.id) AS hallazgos, COUNT(DISTINCT f.audit_id) AS auditoriasAfectadas
           FROM findings f
           JOIN audit_controls ac ON ac.id = f.audit_control_id
           JOIN controls c ON c.id = ac.control_id
          WHERE f.audit_id IN (${marcadores})
          GROUP BY c.id
          ORDER BY hallazgos DESC, c.code ASC
          LIMIT 5`,
      )
      .all(...ids) as DashboardDTO["controlesConMasIncumplimientos"];
  }

  const avisos: string[] = [];
  if (!auditorias.length) avisos.push("Todavía no hay auditorías visibles para tu usuario.");
  const pendientes = estadosControl.get("pendiente") ?? 0;
  if (pendientes > 0) {
    avisos.push(`Hay ${pendientes} controles pendientes de evaluar en las auditorías visibles.`);
  }
  avisos.push(...LIMITACIONES);

  return {
    resumen: {
      totalAuditorias: auditorias.length,
      porEstado: {
        borrador: estadosAuditorias.get("borrador") ?? 0,
        en_curso: estadosAuditorias.get("en_curso") ?? 0,
        cerrada: estadosAuditorias.get("cerrada") ?? 0,
      },
      cumplimientoPromedio,
      totalHallazgos: filasHallazgo.length,
    },
    distribucionEstadosControl: controlStatusValues.map((status) => ({
      status,
      total: estadosControl.get(status) ?? 0,
    })),
    hallazgosPorSeveridad: severityValues.map((severity) => ({
      severity,
      total: severidades.get(severity) ?? 0,
    })),
    cumplimientoPorAuditoria,
    controlesConMasIncumplimientos,
    estaVacio: auditorias.length === 0,
    avisos,
  };
}

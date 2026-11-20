import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Db } from "@/server/db/client";
import { createAudit, listAudits, updateAuditStatus } from "@/server/audits/service";
import { getDashboard } from "@/server/dashboard/service";
import { createEvidence } from "@/server/evidences/service";
import { createFinding, createRecommendation } from "@/server/findings/service";
import { HttpError } from "@/server/lib/errors";
import type { ServiceContext } from "@/server/lib/context";
import { getReport, getResults } from "@/server/reports/service";
import { adminActor, auditorActor, createTestDb, makeCtx, seedBase } from "../helpers/test-db";

const hallazgo = {
  audit_control_id: 2,
  condition: "Faltan revisiones de acceso",
  criterion: "Revisión periódica",
  cause: "Sin responsable",
  effect_risk: "Accesos obsoletos",
  severity: "alta" as const,
};

describe("resultados, informe y dashboard", () => {
  let db: Db;
  let ctx: ServiceContext;

  beforeEach(() => {
    db = createTestDb();
    seedBase(db);
    ctx = makeCtx(db, auditorActor);
  });
  afterEach(() => db.close());

  it("resultados calcula indicadores, categorías completas, trazabilidad y avisos", () => {
    const resultados = getResults(ctx, 1);

    expect(resultados.counts).toMatchObject({
      totalControles: 3,
      evaluados: 2,
      pendientes: 1,
      implementados: 1,
      parcialmenteImplementados: 1,
    });
    expect(resultados.indicators).toMatchObject({ implementados: 50, denominador: 2 });
    expect(resultados.porEstado).toHaveLength(5);
    expect(resultados.porSeveridad).toHaveLength(4);
    expect(resultados.porTema).toHaveLength(4);
    expect(resultados.detallePorControl).toHaveLength(3);
    expect(resultados.trazabilidad).toHaveLength(3);
    expect(resultados.avisos.some((aviso) => aviso.includes("pendientes"))).toBe(true);
    expect(resultados.avisos.filter((aviso) => aviso.includes("no certifica"))).toHaveLength(1);
  });

  it("el informe incluye portada, anexo de evidencias y limitaciones", () => {
    const finding = createFinding(ctx, 1, hallazgo);
    createRecommendation(ctx, finding.id, { description: "Revisar accesos", priority: "alta" });
    createEvidence(ctx, 1, 2, {
      description: "Listado de usuarios",
      source: "Documento interno",
      evidence_date: "2026-02-06",
      reference: "EVD-1",
      is_simulated: true,
    });

    const informe = getReport(ctx, 1);
    expect(informe.portada.organization).toBe("Empresa Uno");
    expect(informe.portada.auditor).toBe(auditorActor.name);
    expect(informe.meta.referentes).toHaveLength(3);
    expect(informe.meta.generadoEn).toBe("2026-02-10T10:00:00.000Z");
    expect(informe.anexoEvidencias[0]).toMatchObject({
      controlCode: "5.15",
      etiquetaSimulada: "Simulada",
    });
    expect(informe.limitaciones).toHaveLength(3);
    expect(informe.resultados.counts.recomendaciones).toBe(1);
  });

  it("dashboard respeta el alcance por rol y muestra todas las categorías", () => {
    createFinding(ctx, 1, hallazgo);

    const delAuditor = getDashboard(ctx);
    expect(delAuditor.resumen.totalAuditorias).toBe(1);
    expect(delAuditor.resumen.cumplimientoPromedio).toBe(50);
    expect(delAuditor.distribucionEstadosControl).toHaveLength(5);
    expect(delAuditor.hallazgosPorSeveridad).toHaveLength(4);
    expect(delAuditor.controlesConMasIncumplimientos[0]).toMatchObject({
      code: "5.15",
      hallazgos: 1,
      auditoriasAfectadas: 1,
    });

    const delAdmin = getDashboard(makeCtx(db, adminActor));
    expect(delAdmin.resumen.totalAuditorias).toBe(2);
    expect(delAdmin.resumen.porEstado).toEqual({ borrador: 0, en_curso: 2, cerrada: 0 });
    expect(delAdmin.resumen.cumplimientoPromedio).toBe(50);
  });
});

describe("creación de auditorías", () => {
  let db: Db;

  beforeEach(() => {
    db = createTestDb();
    seedBase(db);
  });
  afterEach(() => db.close());

  const datos = {
    organization: "Empresa Nueva",
    objective: "Evaluar los controles",
    scope: "Servidores y aplicaciones",
    audit_date: "2026-04-01",
  };

  it("crea una fila pendiente por control activo en una transacción", () => {
    const creada = createAudit(makeCtx(db, adminActor), { ...datos, auditor_id: auditorActor.id });
    expect(creada.auditor_id).toBe(auditorActor.id);
    expect(creada.progress).toEqual({ total: 3, evaluados: 0, pendientes: 3 });
    expect(listAudits(makeCtx(db, auditorActor))).toHaveLength(2);
  });

  it("un auditor no puede elegir auditor: se fuerza su propio id", () => {
    const creada = createAudit(makeCtx(db, auditorActor), { ...datos, auditor_id: adminActor.id });
    expect(creada.auditor_id).toBe(auditorActor.id);
  });

  it("un auditor_id inexistente lanza 400", () => {
    expect(() =>
      createAudit(makeCtx(db, adminActor), { ...datos, auditor_id: 999 }),
    ).toThrowError(HttpError);
  });

  it("borrador y en_curso son intercambiables", () => {
    const creada = createAudit(makeCtx(db, auditorActor), datos);
    expect(creada.status).toBe("borrador");
    expect(
      updateAuditStatus(makeCtx(db, auditorActor), creada.id, { status: "en_curso" }).status,
    ).toBe("en_curso");
    expect(
      updateAuditStatus(makeCtx(db, auditorActor), creada.id, { status: "borrador" }).status,
    ).toBe("borrador");
  });
});

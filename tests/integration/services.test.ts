import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Db } from "@/server/db/client";
import {
  createFinding,
  deleteFinding,
  deleteRecommendation,
} from "@/server/findings/service";
import { createEvidence, deleteEvidence } from "@/server/evidences/service";
import { evaluateControl } from "@/server/evaluations/service";
import { getAudit, updateAudit, updateAuditStatus } from "@/server/audits/service";
import { createControl, listControls, updateControl } from "@/server/controls/service";
import { HttpError } from "@/server/lib/errors";
import type { ServiceContext } from "@/server/lib/context";
import type { ErrorCode } from "@/shared/types";
import {
  adminActor,
  auditorActor,
  createTestDb,
  FECHA_PRUEBA_CORTA,
  makeCtx,
  otroAuditorActor,
  seedBase,
} from "../helpers/test-db";

function esperarError(fn: () => unknown, status: number, code?: ErrorCode): HttpError {
  try {
    fn();
  } catch (error) {
    expect(error).toBeInstanceOf(HttpError);
    const http = error as HttpError;
    expect(http.status).toBe(status);
    if (code) expect(http.code).toBe(code);
    return http;
  }
  throw new Error(`Se esperaba un HttpError con estado ${status}`);
}

const hallazgo = (auditControlId: number) => ({
  audit_control_id: auditControlId,
  condition: "No se revisan privilegios",
  criterion: "Revisión periódica de accesos",
  cause: "Sin procedimiento",
  effect_risk: "Acceso indebido",
  severity: "alta" as const,
});

describe("reglas de evaluación", () => {
  let db: Db;
  let ctx: ServiceContext;

  beforeEach(() => {
    db = createTestDb();
    seedBase(db);
    ctx = makeCtx(db, auditorActor);
  });
  afterEach(() => db.close());

  it("marcar no_aplicable sin justificación lanza HttpError 400 VALIDACION", () => {
    const error = esperarError(
      () => evaluateControl(ctx, 1, 1, { status: "no_aplicable" }),
      400,
      "VALIDACION",
    );
    expect(error.message).toContain("justificación");
    expect(
      (db.prepare("SELECT status FROM audit_controls WHERE id = 1").get() as { status: string }).status,
    ).toBe("implementado");
  });

  it("marcar no_aplicable con justificación guarda fecha y justificación", () => {
    const dto = evaluateControl(ctx, 1, 1, {
      status: "no_aplicable",
      na_justification: "  El control no aplica a este entorno  ",
    });
    expect(dto.status).toBe("no_aplicable");
    expect(dto.na_justification).toBe("El control no aplica a este entorno");
    expect(dto.evaluated_at).toBe(FECHA_PRUEBA_CORTA);
  });

  it("pasar a pendiente limpia observaciones, justificación y fecha", () => {
    evaluateControl(ctx, 1, 2, { status: "no_implementado", observations: "Sin control" });
    const dto = evaluateControl(ctx, 1, 2, { status: "pendiente" });
    expect(dto.status).toBe("pendiente");
    expect(dto.observations).toBe("");
    expect(dto.na_justification).toBeNull();
    expect(dto.evaluated_at).toBeNull();
  });

  it("cerrar con pendientes lanza 409; al evaluarlos permite cerrar", () => {
    esperarError(() => updateAuditStatus(ctx, 1, { status: "cerrada" }), 409, "CONFLICTO");
    evaluateControl(ctx, 1, 3, { status: "implementado" });
    expect(updateAuditStatus(ctx, 1, { status: "cerrada" }).status).toBe("cerrada");
  });

  it("hallazgo sobre control implementado o pendiente lanza 409", () => {
    esperarError(() => createFinding(ctx, 1, hallazgo(1)), 409, "CONFLICTO");
    esperarError(() => createFinding(ctx, 1, hallazgo(3)), 409, "CONFLICTO");
  });

  it("control de otra auditoría lanza 404 en evaluación y hallazgo", () => {
    esperarError(() => evaluateControl(ctx, 1, 4, { status: "implementado" }), 404, "NO_ENCONTRADO");
    esperarError(() => createFinding(ctx, 1, hallazgo(4)), 404, "NO_ENCONTRADO");
  });
});

describe("auditoría cerrada: solo lectura", () => {
  let db: Db;
  let ctx: ServiceContext;

  beforeEach(() => {
    db = createTestDb();
    seedBase(db);
    db.prepare("UPDATE audits SET status = 'cerrada' WHERE id = 1").run();
    ctx = makeCtx(db, auditorActor);
  });
  afterEach(() => db.close());

  it("updateAudit lanza 409", () => {
    esperarError(
      () =>
        updateAudit(ctx, 1, {
          organization: "Otra",
          objective: "Objetivo",
          scope: "Alcance",
          audit_date: "2026-03-01",
        }),
      409,
      "CONFLICTO",
    );
  });

  it("evaluateControl lanza 409", () => {
    esperarError(() => evaluateControl(ctx, 1, 1, { status: "implementado" }), 409, "CONFLICTO");
  });

  it("deleteEvidence lanza 409", () => {
    const id = Number(
      db
        .prepare(
          `INSERT INTO evidences (audit_control_id, description, source, evidence_date, reference, is_simulated)
           VALUES (1, 'Documento', 'Entrevista', '2026-02-01', 'EVD-1', 1)`,
        )
        .run().lastInsertRowid,
    );
    esperarError(() => deleteEvidence(ctx, id), 409, "CONFLICTO");
  });

  it("createFinding lanza 409", () => {
    esperarError(() => createFinding(ctx, 1, hallazgo(2)), 409, "CONFLICTO");
  });

  it("updateAuditStatus lanza 409 aunque el destino sea borrador", () => {
    esperarError(() => updateAuditStatus(ctx, 1, { status: "borrador" }), 409, "CONFLICTO");
  });
});

describe("alcance por rol", () => {
  let db: Db;

  beforeEach(() => {
    db = createTestDb();
    seedBase(db);
  });
  afterEach(() => db.close());

  it("auditor ajeno recibe 403 y administrador puede acceder", () => {
    esperarError(() => getAudit(makeCtx(db, otroAuditorActor), 1), 403, "PROHIBIDO");
    expect(getAudit(makeCtx(db, adminActor), 1).id).toBe(1);
    expect(getAudit(makeCtx(db, auditorActor), 1).auditor_id).toBe(auditorActor.id);
  });
});

describe("catálogo de controles", () => {
  let db: Db;
  let adminCtx: ServiceContext;

  const datos = {
    code: "8.15",
    name: "Registro",
    description: "Registrar eventos",
    criterion: "Existen registros",
    source: "ISO/IEC 27002:2022",
    theme: "Tecnológico" as const,
    active: true,
  };

  beforeEach(() => {
    db = createTestDb();
    seedBase(db);
    adminCtx = makeCtx(db, adminActor);
  });
  afterEach(() => db.close());

  it("código duplicado lanza 409 y un auditor no puede crear", () => {
    esperarError(() => createControl(adminCtx, { ...datos, code: "5.1" }), 409, "CONFLICTO");
    esperarError(
      () => createControl(makeCtx(db, auditorActor), datos),
      403,
      "PROHIBIDO",
    );
  });

  it("editar el catálogo no altera las evaluaciones existentes", () => {
    updateControl(adminCtx, 1, { ...datos, code: "5.1" });
    expect(
      (db.prepare("SELECT status FROM audit_controls WHERE id = 1").get() as { status: string }).status,
    ).toBe("implementado");
    expect(listControls(adminCtx, { active: "1" }).some((c) => c.code === "5.1")).toBe(true);
  });
});

describe("hallazgos, recomendaciones y evidencias", () => {
  let db: Db;
  let ctx: ServiceContext;

  beforeEach(() => {
    db = createTestDb();
    seedBase(db);
    ctx = makeCtx(db, auditorActor);
  });
  afterEach(() => db.close());

  it("borrar un hallazgo elimina sus recomendaciones por CASCADE", () => {
    const finding = createFinding(ctx, 1, hallazgo(2));
    const insertar = db.prepare(
      "INSERT INTO recommendations (finding_id, description, priority) VALUES (?, ?, 'alta')",
    );
    insertar.run(finding.id, "Revisar privilegios");
    insertar.run(finding.id, "Documentar la revisión");

    expect(deleteFinding(ctx, finding.id)).toEqual({ ok: true, id: finding.id });
    const restantes = db
      .prepare("SELECT COUNT(*) AS total FROM recommendations")
      .get() as { total: number };
    expect(restantes.total).toBe(0);
  });

  it("eliminar una recomendación no afecta al hallazgo", () => {
    const finding = createFinding(ctx, 1, hallazgo(2));
    const id = Number(
      db
        .prepare(
          "INSERT INTO recommendations (finding_id, description, priority) VALUES (?, ?, 'media')",
        )
        .run(finding.id, "Acción correctiva").lastInsertRowid,
    );
    expect(deleteRecommendation(ctx, id)).toEqual({ ok: true, id });
    expect(
      (db.prepare("SELECT COUNT(*) AS total FROM findings").get() as { total: number }).total,
    ).toBe(1);
  });

  it("crea evidencia simulada por defecto y la elimina", () => {
    const evidencia = createEvidence(ctx, 1, 2, {
      description: "Evidencia de prueba",
      source: "Entrevista",
      evidence_date: "2026-02-05",
      reference: "",
      is_simulated: true,
    });
    expect(evidencia.is_simulated).toBe(true);
    expect(deleteEvidence(ctx, evidencia.id)).toEqual({ ok: true, id: evidencia.id });
  });
});

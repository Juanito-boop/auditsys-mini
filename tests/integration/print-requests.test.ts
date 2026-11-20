import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createDb, type Db } from "@/server/db/client";
import { HttpError } from "@/server/lib/errors";
import {
  printRequestCreateSchema,
  printRequestQuerySchema,
} from "@/server/print-requests/schemas";
import { listPrintRequests, registerPrintRequest } from "@/server/print-requests/service";
import {
  adminActor,
  auditorActor,
  createTestDb,
  FECHA_PRUEBA,
  makeCtx,
  otroAuditorActor,
  seedBase,
} from "../helpers/test-db";

const CLAVE_UNO = "11111111-1111-4111-8111-111111111111";
const CLAVE_DOS = "22222222-2222-4222-8222-222222222222";
const CLAVE_TRES = "33333333-3333-4333-8333-333333333333";
const CLAVE_CUATRO = "44444444-4444-4444-8444-444444444444";

function totalSolicitudes(db: Db): number {
  return (db.prepare("SELECT COUNT(*) AS total FROM report_print_requests").get() as { total: number })
    .total;
}

function capturarError(fn: () => unknown): HttpError {
  try {
    fn();
  } catch (error) {
    expect(error).toBeInstanceOf(HttpError);
    return error as HttpError;
  }
  throw new Error("Se esperaba un HttpError");
}

describe("solicitudes de impresión de informes", () => {
  let db: Db;

  beforeEach(() => {
    db = createTestDb();
    seedBase(db);
  });
  afterEach(() => db.close());

  it("registra una solicitud usando la identidad del actor y la fecha inyectada", () => {
    const { dto, created } = registerPrintRequest(makeCtx(db, adminActor), 1, {
      origin: "resultados",
      requestKey: CLAVE_UNO,
    });

    expect(created).toBe(true);
    expect(dto).toEqual({
      id: 1,
      auditId: 1,
      userId: adminActor.id,
      userName: adminActor.name,
      userEmail: adminActor.email,
      requestedAt: FECHA_PRUEBA,
      origin: "resultados",
    });
    expect(totalSolicitudes(db)).toBe(1);
  });

  it("un replay con la misma clave no inserta y devuelve created=false", () => {
    const ctx = makeCtx(db, auditorActor);
    const primera = registerPrintRequest(ctx, 1, { origin: "informe", requestKey: CLAVE_UNO });
    const replay = registerPrintRequest(ctx, 1, { origin: "informe", requestKey: CLAVE_UNO });

    expect(replay.created).toBe(false);
    expect(replay.dto).toEqual(primera.dto);
    expect(totalSolicitudes(db)).toBe(1);
  });

  it("la misma clave con distinto origen es un conflicto 409", () => {
    registerPrintRequest(makeCtx(db, auditorActor), 1, {
      origin: "resultados",
      requestKey: CLAVE_UNO,
    });

    const error = capturarError(() =>
      registerPrintRequest(makeCtx(db, auditorActor), 1, {
        origin: "informe",
        requestKey: CLAVE_UNO,
      }),
    );
    expect(error).toMatchObject({
      code: "CONFLICTO",
      status: 409,
      message: "La clave de solicitud ya está registrada con otro origen.",
    });
    expect(totalSolicitudes(db)).toBe(1);
  });

  it("un auditor ajeno recibe 403 y una auditoría inexistente 404", () => {
    const ajeno = capturarError(() =>
      registerPrintRequest(makeCtx(db, auditorActor), 2, {
        origin: "resultados",
        requestKey: CLAVE_UNO,
      }),
    );
    expect(ajeno).toMatchObject({ code: "PROHIBIDO", status: 403 });

    const inexistente = capturarError(() =>
      registerPrintRequest(makeCtx(db, adminActor), 999, {
        origin: "resultados",
        requestKey: CLAVE_DOS,
      }),
    );
    expect(inexistente).toMatchObject({ code: "NO_ENCONTRADO", status: 404 });
    expect(totalSolicitudes(db)).toBe(0);
  });

  it("el listado respeta el alcance por rol sin exigir administrador", () => {
    const ajeno = capturarError(() => listPrintRequests(makeCtx(db, auditorActor), 2));
    expect(ajeno).toMatchObject({ code: "PROHIBIDO", status: 403 });
    expect(listPrintRequests(makeCtx(db, otroAuditorActor), 2)).toEqual({
      auditId: 2,
      total: 0,
      solicitudes: [],
      porUsuario: [],
    });
  });

  it("permite registrar solicitudes en auditorías cerradas", () => {
    db.prepare("UPDATE audits SET status = 'cerrada' WHERE id = 1").run();

    const { dto, created } = registerPrintRequest(makeCtx(db, auditorActor), 1, {
      origin: "resultados",
      requestKey: CLAVE_UNO,
    });
    expect(created).toBe(true);
    expect(dto.auditId).toBe(1);
    expect(listPrintRequests(makeCtx(db, auditorActor), 1).total).toBe(1);
  });

  it("el email del snapshot solo se expone a administradores", () => {
    registerPrintRequest(makeCtx(db, adminActor), 1, {
      origin: "resultados",
      requestKey: CLAVE_UNO,
    });
    registerPrintRequest(makeCtx(db, auditorActor), 1, {
      origin: "informe",
      requestKey: CLAVE_DOS,
    });

    const delAdmin = listPrintRequests(makeCtx(db, adminActor), 1);
    expect(delAdmin.solicitudes.map((s) => s.userEmail)).toEqual([
      auditorActor.email,
      adminActor.email,
    ]);
    expect(delAdmin.porUsuario.every((u) => u.userEmail !== null)).toBe(true);

    const delAuditor = listPrintRequests(makeCtx(db, auditorActor), 1);
    expect(delAuditor.solicitudes.every((s) => s.userEmail === null)).toBe(true);
    expect(delAuditor.porUsuario.every((u) => u.userEmail === null)).toBe(true);
    expect(delAuditor.solicitudes.every((s) => s.userName.length > 0)).toBe(true);
  });

  it("una auditoría sin solicitudes devuelve total cero y arrays vacíos", () => {
    expect(listPrintRequests(makeCtx(db, auditorActor), 1)).toEqual({
      auditId: 1,
      total: 0,
      solicitudes: [],
      porUsuario: [],
    });
  });

  it("los snapshots no cambian si se modifica el usuario", () => {
    registerPrintRequest(makeCtx(db, auditorActor), 1, {
      origin: "resultados",
      requestKey: CLAVE_UNO,
    });
    db.prepare("UPDATE users SET name = ?, email = ? WHERE id = ?").run(
      "Nombre cambiado",
      "cambiado@test.local",
      auditorActor.id,
    );

    const listado = listPrintRequests(makeCtx(db, adminActor), 1);
    expect(listado.solicitudes[0]).toMatchObject({
      userName: auditorActor.name,
      userEmail: auditorActor.email,
    });
    expect(listado.porUsuario[0]).toMatchObject({
      userName: auditorActor.name,
      userEmail: auditorActor.email,
    });
  });

  it("ordena por fecha e id descendente y agrupa conservando el snapshot más reciente", () => {
    const haceUnDia = makeCtx(db, { ...auditorActor, name: "Auditor anterior" }, "2026-02-09T10:00:00.000Z");
    const ahora = "2026-02-10T10:00:00.000Z";

    registerPrintRequest(haceUnDia, 1, { origin: "resultados", requestKey: CLAVE_UNO });
    registerPrintRequest(makeCtx(db, adminActor), 1, { origin: "informe", requestKey: CLAVE_DOS });
    const tercera = registerPrintRequest(makeCtx(db, auditorActor, ahora), 1, {
      origin: "informe",
      requestKey: CLAVE_TRES,
    });
    const cuarta = registerPrintRequest(makeCtx(db, auditorActor, ahora), 1, {
      origin: "resultados",
      requestKey: CLAVE_CUATRO,
    });

    const listado = listPrintRequests(makeCtx(db, adminActor), 1);
    expect(listado.total).toBe(4);
    expect(listado.solicitudes.map((s) => s.id)).toEqual([
      cuarta.dto.id,
      tercera.dto.id,
      2,
      1,
    ]);
    expect(listado.solicitudes.map((s) => s.requestedAt)).toEqual([
      ahora,
      ahora,
      FECHA_PRUEBA,
      "2026-02-09T10:00:00.000Z",
    ]);
    expect(listado.solicitudes.map((s) => s.origin)).toEqual([
      "resultados",
      "informe",
      "informe",
      "resultados",
    ]);
    expect(listado.porUsuario).toEqual([
      {
        userId: auditorActor.id,
        userName: auditorActor.name,
        userEmail: auditorActor.email,
        total: 3,
        ultimaSolicitudEn: ahora,
      },
      {
        userId: adminActor.id,
        userName: adminActor.name,
        userEmail: adminActor.email,
        total: 1,
        ultimaSolicitudEn: FECHA_PRUEBA,
      },
    ]);
  });

  it("limita el listado a 50 recientes sin recortar el total ni la agrupación", () => {
    const clave = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
    const fecha = (n: number) => new Date(Date.parse(FECHA_PRUEBA) + n * 1000).toISOString();

    for (let n = 0; n < 51; n += 1) {
      registerPrintRequest(makeCtx(db, auditorActor, fecha(n)), 1, {
        origin: "resultados",
        requestKey: clave(n),
      });
    }

    const listado = listPrintRequests(makeCtx(db, auditorActor), 1);
    expect(listado.total).toBe(51);
    expect(listado.solicitudes).toHaveLength(50);
    expect(listado.solicitudes[0]).toMatchObject({ id: 51, requestedAt: fecha(50) });
    expect(listado.solicitudes.some((s) => s.requestedAt === fecha(0))).toBe(false);
    expect(listado.porUsuario).toEqual([
      {
        userId: auditorActor.id,
        userName: auditorActor.name,
        userEmail: null,
        total: 51,
        ultimaSolicitudEn: fecha(50),
      },
    ]);
    expect(listado.porUsuario.reduce((sum, u) => sum + u.total, 0)).toBe(51);
  });

  it("valida origen, UUID y claves extra del cuerpo", () => {
    expect(printRequestCreateSchema.safeParse({ origin: "otro", requestKey: CLAVE_UNO }).success).toBe(
      false,
    );
    expect(
      printRequestCreateSchema.safeParse({ origin: "resultados", requestKey: "no-es-uuid" }).success,
    ).toBe(false);
    expect(
      printRequestCreateSchema.safeParse({
        origin: "resultados",
        requestKey: CLAVE_UNO,
        user_id: adminActor.id,
      }).success,
    ).toBe(false);
    expect(printRequestQuerySchema.safeParse({}).success).toBe(true);
    expect(printRequestQuerySchema.safeParse({ pendiente: "1" }).success).toBe(false);
    expect(totalSolicitudes(db)).toBe(0);
  });
});

describe("concurrencia en solicitudes de impresión", () => {
  let directorio: string;
  let db: Db;
  let otraConexion: Db;

  beforeEach(() => {
    directorio = mkdtempSync(join(tmpdir(), "auditsys-print-"));
    const ruta = join(directorio, "concurrencia.db");
    db = createDb(ruta);
    otraConexion = createDb(ruta);
    seedBase(db);
  });

  afterEach(() => {
    db.close();
    otraConexion.close();
    rmSync(directorio, { recursive: true, force: true });
  });

  /** Inserta la fila rival justo antes de nuestro INSERT, tras la comprobación de existencia. */
  function ctxConInsercionRival(origin: "resultados" | "informe") {
    let insertado = false;
    const base = makeCtx(db, auditorActor);
    return {
      ...base,
      now: () => {
        if (!insertado) {
          insertado = true;
          otraConexion
            .prepare(
              `INSERT INTO report_print_requests
               (audit_id, user_id, requested_at, user_name_snapshot, user_email_snapshot, origin, request_key)
               VALUES (?, ?, ?, ?, ?, ?, ?)`,
            )
            .run(
              1,
              auditorActor.id,
              FECHA_PRUEBA,
              auditorActor.name,
              auditorActor.email,
              origin,
              CLAVE_UNO,
            );
        }
        return FECHA_PRUEBA;
      },
    };
  }

  it("una violación UNIQUE concurrente se relee como replay", () => {
    const { dto, created } = registerPrintRequest(ctxConInsercionRival("resultados"), 1, {
      origin: "resultados",
      requestKey: CLAVE_UNO,
    });

    expect(created).toBe(false);
    expect(dto.userId).toBe(auditorActor.id);
    expect(dto.origin).toBe("resultados");
    expect(totalSolicitudes(db)).toBe(1);
  });

  it("una violación UNIQUE concurrente con otro origen devuelve 409", () => {
    const error = capturarError(() =>
      registerPrintRequest(ctxConInsercionRival("informe"), 1, {
        origin: "resultados",
        requestKey: CLAVE_UNO,
      }),
    );

    expect(error).toMatchObject({ code: "CONFLICTO", status: 409 });
    expect(totalSolicitudes(db)).toBe(1);
  });
});

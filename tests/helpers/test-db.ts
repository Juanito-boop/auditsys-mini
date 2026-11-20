import { createDb, type Db } from "@/server/db/client";
import type { ServiceContext } from "@/server/lib/context";
import type { Actor } from "@/shared/types";

export const FECHA_PRUEBA = "2026-02-10T10:00:00.000Z";
export const FECHA_PRUEBA_CORTA = FECHA_PRUEBA.slice(0, 10);

export const adminActor: Actor = {
  id: 1,
  name: "Admin de pruebas",
  email: "admin@test.local",
  role: "admin",
};
export const auditorActor: Actor = {
  id: 2,
  name: "Auditor de pruebas",
  email: "auditor@test.local",
  role: "auditor",
};
export const otroAuditorActor: Actor = {
  id: 3,
  name: "Otro auditor",
  email: "otro@test.local",
  role: "auditor",
};

export function createTestDb(): Db {
  return createDb(":memory:");
}

export function makeCtx(db: Db, actor: Actor, now: string = FECHA_PRUEBA): ServiceContext {
  return { db, actor, now: () => now };
}

/** Escenario mínimo: 3 usuarios, 3 controles y 2 auditorías con 3 controles cada una. */
export function seedBase(db: Db): void {
  const usuario = db.prepare(
    "INSERT INTO users (id, name, email, password_hash, role) VALUES (?, ?, ?, 'hash', ?)",
  );
  usuario.run(adminActor.id, adminActor.name, adminActor.email, adminActor.role);
  usuario.run(auditorActor.id, auditorActor.name, auditorActor.email, auditorActor.role);
  usuario.run(otroAuditorActor.id, otroAuditorActor.name, otroAuditorActor.email, otroAuditorActor.role);

  const control = db.prepare(
    `INSERT INTO controls (id, code, name, description, criterion, source, theme, active)
     VALUES (?, ?, ?, 'Descripción de prueba', 'Criterio de prueba', 'ISO/IEC 27002:2022', ?, 1)`,
  );
  control.run(1, "5.1", "Políticas", "Organizacional");
  control.run(2, "5.15", "Acceso", "Organizacional");
  control.run(3, "8.8", "Vulnerabilidades", "Tecnológico");

  const auditoria = db.prepare(
    `INSERT INTO audits (id, organization, objective, scope, audit_date, auditor_id, status)
     VALUES (?, ?, 'Objetivo de prueba', 'Alcance de prueba', '2026-02-01', ?, 'en_curso')`,
  );
  auditoria.run(1, "Empresa Uno", auditorActor.id);
  auditoria.run(2, "Empresa Dos", otroAuditorActor.id);

  const auditControl = db.prepare(
    `INSERT INTO audit_controls (id, audit_id, control_id, status, observations, na_justification, evaluated_at)
     VALUES (?, ?, ?, ?, '', NULL, ?)`,
  );
  auditControl.run(1, 1, 1, "implementado", FECHA_PRUEBA_CORTA);
  auditControl.run(2, 1, 2, "parcialmente_implementado", FECHA_PRUEBA_CORTA);
  auditControl.run(3, 1, 3, "pendiente", null);
  auditControl.run(4, 2, 1, "pendiente", null);
  auditControl.run(5, 2, 2, "pendiente", null);
  auditControl.run(6, 2, 3, "pendiente", null);
}

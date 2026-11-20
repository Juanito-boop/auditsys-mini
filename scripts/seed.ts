/**
 * Seed idempotente de AuditSys Mini. Fase 2: solo usuarios.
 * Fase 7 añadirá aquí los controles y las auditorías de demostración.
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { hashPassword } from "../src/server/auth/service";
import { createDb, type Db } from "../src/server/db/client";

/** tsx no carga .env.local automáticamente: loader mínimo sin dependencias. */
function loadEnvLocal(): void {
  if (process.env.AUTH_SECRET) return;

  const ruta = resolve(process.cwd(), ".env.local");
  if (!existsSync(ruta)) return;

  const contenido = readFileSync(ruta, "utf8");
  for (const linea of contenido.split(/\r?\n/)) {
    const texto = linea.trim();
    if (!texto || texto.startsWith("#")) continue;

    const separador = texto.indexOf("=");
    if (separador === -1) continue;

    const clave = texto.slice(0, separador).trim();
    const valor = texto.slice(separador + 1).trim();
    if (!clave || process.env[clave] !== undefined) continue;
    process.env[clave] = valor;
  }
}

interface ResultadoUsuarios {
  creados: number;
  actualizados: number;
  total: number;
  detalle: Array<{ email: string; accion: "creado" | "actualizado" }>;
}

function seedUsers(db: Db, passwordHash: string): ResultadoUsuarios {
  const usuarios = [
    { email: "admin@auditsys.test", name: "Admin del Sistema", role: "admin" },
    { email: "auditor@auditsys.test", name: "Auditor Demo", role: "auditor" },
  ] as const;

  const existe = db.prepare("SELECT 1 FROM users WHERE email = ?");
  const upsert = db.prepare(`
    INSERT INTO users (name, email, password_hash, role)
    VALUES (@name, @email, @password_hash, @role)
    ON CONFLICT(email) DO UPDATE SET
      password_hash = excluded.password_hash,
      name = excluded.name,
      role = excluded.role
  `);
  const contar = db.prepare("SELECT COUNT(*) AS total FROM users");

  return db.transaction(() => {
    const detalle: ResultadoUsuarios["detalle"] = [];
    let creados = 0;
    let actualizados = 0;

    for (const usuario of usuarios) {
      const yaExiste = Boolean(existe.get(usuario.email));
      upsert.run({ ...usuario, password_hash: passwordHash });
      detalle.push({ email: usuario.email, accion: yaExiste ? "actualizado" : "creado" });
      if (yaExiste) actualizados += 1;
      else creados += 1;
    }

    const { total } = contar.get() as { total: number };
    return { creados, actualizados, total, detalle };
  })();
}

async function main(): Promise<void> {
  loadEnvLocal();

  const db = createDb(process.env.DATABASE_PATH ?? "data/auditsys.db");
  try {
    const passwordHash = await hashPassword(process.env.SEED_PASSWORD ?? "Auditoria2026!");
    const resultado = seedUsers(db, passwordHash);

    console.log("Seed de usuarios completado.");
    for (const item of resultado.detalle) {
      console.log(`- ${item.email}: ${item.accion}`);
    }
    console.log(
      `Usuarios creados: ${resultado.creados}; actualizados: ${resultado.actualizados}; total: ${resultado.total}.`
    );
  } finally {
    db.close();
  }
}

main().catch((error: unknown) => {
  console.error("Error al ejecutar el seed:", error);
  process.exitCode = 1;
});

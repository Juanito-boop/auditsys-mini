/**
 * Seed idempotente de AuditSys Mini: usuarios, catálogo ISO/IEC 27002:2022,
 * auditoría de demostración de Empresa ABC y auditoría piloto comparativa.
 *
 * Los datos son ficticios y todas las evidencias están marcadas como simuladas.
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { hashPassword } from "../src/server/auth/service";
import { createDb, type Db } from "../src/server/db/client";
import type { Actor } from "../src/shared/types";

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

interface ControlDemo {
  code: string;
  name: string;
  theme: "Organizacional" | "Personas" | "Tecnológico";
  description: string;
  criterion: string;
  observaciones: string;
  estado: "implementado" | "parcialmente_implementado" | "no_implementado" | "no_aplicable";
  justificacion?: string;
}

const CONTROLES: ControlDemo[] = [
  {
    code: "5.1",
    name: "Políticas de seguridad de la información",
    theme: "Organizacional",
    description:
      "Empresa ABC dispone de un conjunto de políticas de seguridad aprobadas por la dirección, revisadas anualmente y comunicadas a todo el personal.",
    criterion: "Existen políticas aprobadas, fechadas, revisadas periódicamente y difundidas a los usuarios.",
    observaciones: "Se revisó la política general v2.1 y su acta de aprobación; está publicada en el portal interno.",
    estado: "implementado",
  },
  {
    code: "5.9",
    name: "Inventario de información y otros activos asociados",
    theme: "Organizacional",
    description:
      "Se mantiene un inventario de servidores, estaciones de trabajo, aplicaciones y bases de datos de clientes con propietario y clasificación.",
    criterion: "El inventario está actualizado, identifica propietarios y clasifica la información.",
    observaciones: "Se verificó el inventario de activos de marzo de 2026: 42 servidores y 118 estaciones de trabajo.",
    estado: "implementado",
  },
  {
    code: "5.15",
    name: "Control de acceso",
    theme: "Organizacional",
    description:
      "La organización define reglas de acceso por roles, pero la revisión periódica de privilegios no está formalizada.",
    criterion: "Los accesos se conceden por necesidad de conocimiento y se revisan periódicamente.",
    observaciones: "Existe procedimiento de alta y baja, pero no se documentaron las revisiones trimestrales de usuarios.",
    estado: "parcialmente_implementado",
  },
  {
    code: "5.17",
    name: "Información de autenticación",
    theme: "Organizacional",
    description:
      "Se gestionan credenciales con políticas de complejidad, caducidad y custodia de secretos en un gestor corporativo.",
    criterion: "Las credenciales se protegen y se gestionan de forma segura durante todo su ciclo de vida.",
    observaciones: "Se comprobó la configuración de complejidad y el uso del gestor de secretos corporativo.",
    estado: "implementado",
  },
  {
    code: "5.24",
    name: "Planificación y preparación de la gestión de incidentes",
    theme: "Organizacional",
    description:
      "Empresa ABC tiene un procedimiento de gestión de incidentes, sin planes de prueba ni métricas de respuesta definidas.",
    criterion: "Existen procedimientos, responsables designados y pruebas periódicas de respuesta a incidentes.",
    observaciones: "El procedimiento existe, pero no hay registros de simulacros ni tiempos objetivo de respuesta.",
    estado: "parcialmente_implementado",
  },
  {
    code: "5.30",
    name: "Preparación de las TIC para la continuidad del negocio",
    theme: "Tecnológico",
    description:
      "La continuidad de los servicios TIC se delega en el proveedor de nube; no hay infraestructura propia crítica dentro del alcance.",
    criterion: "Se planifican y prueban los aspectos de continuidad de las TIC que soportan procesos críticos.",
    observaciones: "No se evalúa por ausencia de sistemas TIC críticos propios dentro del alcance auditado.",
    estado: "no_aplicable",
    justificacion:
      "Empresa ABC no dispone de sistemas TIC críticos propios: la continuidad depende del proveedor externo de servicios en la nube, cuyos controles quedan fuera del alcance de esta auditoría.",
  },
  {
    code: "6.3",
    name: "Concienciación, educación y formación en seguridad",
    theme: "Personas",
    description:
      "No se ha implantado un programa periódico de concienciación en seguridad para empleados ni para usuarios externos.",
    criterion: "El personal recibe formación en seguridad periódica y relevante para su puesto.",
    observaciones: "No se aportaron registros de formación ni material de concienciación en el último año.",
    estado: "no_implementado",
  },
  {
    code: "8.2",
    name: "Derechos de acceso privilegiado",
    theme: "Tecnológico",
    description: "Las cuentas privilegiadas no están inventariadas ni se controlan de forma centralizada.",
    criterion: "Los derechos privilegiados se limitan, se registran y se revisan periódicamente.",
    observaciones: "Se detectaron cuentas de administrador compartidas en varios servidores de aplicación.",
    estado: "no_implementado",
  },
  {
    code: "8.5",
    name: "Autenticación segura",
    theme: "Tecnológico",
    description:
      "Los accesos a aplicaciones y servidores exigen autenticación multifactor y se deshabilitan las credenciales obsoletas.",
    criterion: "Se aplica autenticación multifactor según el riesgo y se revisan los mecanismos de acceso.",
    observaciones: "Se verificó la autenticación multifactor en VPN, correo corporativo y aplicaciones empresariales.",
    estado: "implementado",
  },
  {
    code: "8.7",
    name: "Protección contra malware",
    theme: "Tecnológico",
    description:
      "Existe antivirus corporativo, pero las actualizaciones no se verifican en todas las estaciones de trabajo remotas.",
    criterion: "La protección contra malware se mantiene actualizada y se monitoriza en todos los endpoints.",
    observaciones: "El antivirus está desplegado, aunque 12 estaciones remotas tienen definiciones de hace más de 30 días.",
    estado: "parcialmente_implementado",
  },
  {
    code: "8.8",
    name: "Gestión de vulnerabilidades técnicas",
    theme: "Tecnológico",
    description: "No existe un proceso formal de detección, priorización y remediación de vulnerabilidades técnicas.",
    criterion: "Las vulnerabilidades se identifican, clasifican y corrigen en plazos definidos.",
    observaciones: "No se aportaron informes de escaneo ni registros de remediación de vulnerabilidades.",
    estado: "no_implementado",
  },
  {
    code: "8.13",
    name: "Copias de seguridad de la información",
    theme: "Tecnológico",
    description:
      "Se realizan copias diarias de las bases de datos de clientes con retención de 30 días y restauraciones de prueba trimestrales.",
    criterion: "Se realizan copias periódicas, se protegen y se verifica su restauración.",
    observaciones: "Se revisó el informe de restauración satisfactoria de la base de datos de clientes de febrero de 2026.",
    estado: "implementado",
  },
  {
    code: "8.15",
    name: "Registro (logging)",
    theme: "Tecnológico",
    description:
      "Los servidores generan registros de eventos, pero no están centralizados y el periodo de retención es heterogéneo.",
    criterion: "Los registros se generan, protegen, centralizan y revisan ante eventos de seguridad.",
    observaciones: "Se revisaron registros locales; no existe una plataforma centralizada ni política de retención uniforme.",
    estado: "parcialmente_implementado",
  },
  {
    code: "8.23",
    name: "Filtrado web",
    theme: "Tecnológico",
    description: "El filtrado de sitios web lo gestiona íntegramente el proveedor de servicios gestionados.",
    criterion: "Se restringe el acceso a sitios web no autorizados según la política de la organización.",
    observaciones: "Fuera del alcance: Empresa ABC no administra el filtrado web de su red corporativa.",
    estado: "no_aplicable",
    justificacion:
      "El proveedor de servicios gestionados aplica su propio filtrado web y Empresa ABC no administra esa configuración; no existe una política de filtrado web propia dentro del alcance revisado.",
  },
  {
    code: "8.24",
    name: "Uso de criptografía",
    theme: "Tecnológico",
    description:
      "Las bases de datos de clientes no cifran la información en reposo y no existe una política criptográfica formal.",
    criterion: "Se define y aplica el uso de criptografía para proteger la confidencialidad e integridad de la información.",
    observaciones: "Se comprobó que la base de datos de clientes y sus copias se almacenan sin cifrar.",
    estado: "no_implementado",
  },
];

const EVIDENCIAS: Array<[string, string]> = [
  ["5.1", "Política de seguridad de la información v2.1 – documento simulado"],
  ["5.1", "Acta de aprobación de políticas de seguridad – documento simulado"],
  ["5.9", "Inventario de activos tecnológicos de Empresa ABC – documento simulado"],
  ["5.15", "Procedimiento de altas y bajas de usuarios – documento simulado"],
  ["5.15", "Listado de usuarios con acceso a aplicaciones empresariales – documento simulado"],
  ["5.17", "Configuración de complejidad de contraseñas – documento simulado"],
  ["5.24", "Procedimiento de gestión de incidentes de seguridad – documento simulado"],
  ["5.24", "Registro de incidentes del primer trimestre – documento simulado"],
  ["5.30", "Contrato de servicios en la nube con proveedor externo – documento simulado"],
  ["6.3", "Entrevista con responsable de personas sobre formación – documento simulado"],
  ["8.2", "Listado de cuentas de administrador en servidores – documento simulado"],
  ["8.5", "Configuración de autenticación multifactor en VPN – documento simulado"],
  ["8.7", "Informe de actualización de antivirus de estaciones – documento simulado"],
  ["8.8", "Entrevista sobre gestión de vulnerabilidades técnicas – documento simulado"],
  ["8.8", "Captura del gestor de incidencias sin registros de remediación – documento simulado"],
  ["8.13", "Informe de restauración de copias de seguridad – documento simulado"],
  ["8.15", "Configuración de registros en servidores de aplicación – documento simulado"],
  ["8.23", "Descripción del servicio de filtrado del proveedor – documento simulado"],
  ["8.24", "Configuración de cifrado de la base de datos de clientes – documento simulado"],
  ["8.24", "Entrevista con el administrador de bases de datos – documento simulado"],
];

interface HallazgoDemo {
  code: string;
  condition: string;
  criterion: string;
  cause: string;
  effect_risk: string;
  severity: "baja" | "media" | "alta" | "critica";
  recomendaciones: Array<{ description: string; priority: "baja" | "media" | "alta" }>;
}

const HALLAZGOS: HallazgoDemo[] = [
  {
    code: "5.15",
    condition: "No se documentan las revisiones periódicas de acceso de usuarios internos y externos.",
    criterion: "Los derechos de acceso se revisan al menos trimestralmente y se aprueban por el responsable del área.",
    cause: "No se designó a ninguna persona responsable de programar y registrar la revisión de accesos.",
    effect_risk: "Pueden permanecer activos privilegios de usuarios que ya no los necesitan.",
    severity: "alta",
    recomendaciones: [
      { description: "Definir una revisión trimestral de accesos con aprobación del responsable de área.", priority: "alta" },
      { description: "Registrar cada revisión en el sistema de tickets corporativo.", priority: "media" },
    ],
  },
  {
    code: "5.24",
    condition: "No existen registros de simulacros de incidentes ni tiempos objetivo de respuesta.",
    criterion: "La organización prueba periódicamente su capacidad de respuesta ante incidentes de seguridad.",
    cause: "El procedimiento de incidentes se redactó sin planificar actividades de prueba.",
    effect_risk: "La respuesta real ante un incidente puede ser lenta o descoordinada.",
    severity: "media",
    recomendaciones: [
      { description: "Programar un simulacro anual de respuesta a incidentes con acta de resultados.", priority: "media" },
    ],
  },
  {
    code: "6.3",
    condition: "El personal no ha recibido formación en seguridad durante los últimos doce meses.",
    criterion: "Todo el personal recibe concienciación en seguridad al menos una vez al año.",
    cause: "No existe un presupuesto ni un plan anual de formación en seguridad.",
    effect_risk: "Aumenta la probabilidad de errores humanos que faciliten accesos no autorizados o phishing.",
    severity: "alta",
    recomendaciones: [
      { description: "Implantar un plan anual de concienciación en seguridad para empleados y usuarios externos.", priority: "alta" },
      { description: "Registrar la asistencia y evaluar los contenidos al final de cada sesión.", priority: "baja" },
    ],
  },
  {
    code: "8.2",
    condition: "Se utilizaron cuentas de administrador compartidas en varios servidores de aplicación.",
    criterion: "Los derechos privilegiados son nominativos, están inventariados y se revisan mensualmente.",
    cause: "No se implantó un mecanismo centralizado de gestión de cuentas privilegiadas.",
    effect_risk: "No es posible atribuir acciones administrativas a una persona concreta.",
    severity: "critica",
    recomendaciones: [
      { description: "Eliminar las cuentas compartidas y sustituirlas por credenciales nominativas.", priority: "alta" },
      { description: "Inventariar y revisar mensualmente todos los derechos privilegiados.", priority: "alta" },
    ],
  },
  {
    code: "8.8",
    condition: "No se ejecutan escaneos periódicos de vulnerabilidades ni se registran sus remediaciones.",
    criterion: "Las vulnerabilidades técnicas se detectan, priorizan y corrigen en plazos definidos.",
    cause: "No se asignó la responsabilidad de gestionar el ciclo de vida de las vulnerabilidades.",
    effect_risk: "Vulnerabilidades conocidas pueden explotarse sin que la organización lo detecte.",
    severity: "alta",
    recomendaciones: [
      { description: "Establecer un escaneo mensual de vulnerabilidades con plazos de remediación por severidad.", priority: "alta" },
    ],
  },
  {
    code: "8.24",
    condition: "La base de datos de clientes y sus copias se almacenan sin cifrado en reposo.",
    criterion: "Se aplica cifrado a la información sensible según la política criptográfica de la organización.",
    cause: "No se aprobó una política criptográfica ni se definieron los algoritmos obligatorios.",
    effect_risk: "Un acceso físico o una copia sustraída podría exponer datos personales de clientes.",
    severity: "alta",
    recomendaciones: [
      { description: "Aplicar cifrado en reposo a la base de datos de clientes y a sus copias de seguridad.", priority: "alta" },
    ],
  },
  {
    code: "8.7",
    condition: "Doce estaciones de trabajo remotas mantienen definiciones de antivirus con más de treinta días de antigüedad.",
    criterion: "La protección contra malware permanece actualizada en todos los equipos del inventario.",
    cause: "Los equipos remotos no informan de su estado de actualización al centro de gestión.",
    effect_risk: "Esos equipos pueden ser vulnerables a malware reciente.",
    severity: "media",
    recomendaciones: [],
  },
];

const AUDITORIA_ABC = {
  organization: "Empresa ABC",
  objective:
    "Evaluar el diseño y la implementación de los controles del Anexo A de ISO/IEC 27001:2022 en Empresa ABC e identificar brechas y mejoras.",
  scope:
    "Servidores, estaciones de trabajo, aplicaciones empresariales, bases de datos de clientes, red corporativa, usuarios internos y externos y políticas de seguridad de la información.",
  audit_date: "2026-02-16",
  status: "en_curso",
} as const;

const AUDITORIA_PILOTO = {
  organization: "Universidad Ejemplo",
  objective: "Comprobar el funcionamiento del proceso de auditoría con un conjunto reducido de controles.",
  scope: "Aula informática y portal web institucional de la Universidad Ejemplo.",
  audit_date: "2026-03-02",
  status: "borrador",
} as const;

const FECHA_EVALUACION = "2026-02-16";
const FUENTE_EVIDENCIA = "Entrevista / documento interno simulado";

function contar(db: Db, sql: string, parametros: unknown[] = []): number {
  return (db.prepare(sql).get(...parametros) as { total: number }).total;
}

function imprimirConteos(db: Db): void {
  const estados = db
    .prepare("SELECT status, COUNT(*) AS total FROM audit_controls GROUP BY status ORDER BY status")
    .all() as Array<{ status: string; total: number }>;

  console.log("\nConteos reales en la base de datos:");
  console.log(`- Usuarios: ${contar(db, "SELECT COUNT(*) AS total FROM users")}`);
  console.log(`- Controles: ${contar(db, "SELECT COUNT(*) AS total FROM controls")}`);
  console.log(`- Auditorías: ${contar(db, "SELECT COUNT(*) AS total FROM audits")}`);
  for (const estado of estados) console.log(`- audit_controls ${estado.status}: ${estado.total}`);
  console.log(`- Evidencias: ${contar(db, "SELECT COUNT(*) AS total FROM evidences")}`);
  console.log(`- Hallazgos: ${contar(db, "SELECT COUNT(*) AS total FROM findings")}`);
  console.log(`- Recomendaciones: ${contar(db, "SELECT COUNT(*) AS total FROM recommendations")}`);
}

function seedDatos(db: Db, auditorId: number): void {
  const existeDemo = db
    .prepare("SELECT 1 FROM audits WHERE organization = ? AND objective = ?")
    .get(AUDITORIA_ABC.organization, AUDITORIA_ABC.objective);
  if (existeDemo) {
    console.log("La auditoría demo ya existe: no se reinserta ningún dato.");
    return;
  }

  db.transaction(() => {
    // Catálogo: se reutilizan los códigos ya presentes para no duplicarlos.
    const idsPorCodigo = new Map<string, number>();
    const filas = db.prepare("SELECT id, code FROM controls").all() as Array<{
      id: number;
      code: string;
    }>;
    for (const fila of filas) idsPorCodigo.set(fila.code, fila.id);

    const insertarControl = db.prepare(
      `INSERT INTO controls (code, name, description, criterion, source, theme, active)
       VALUES (@code, @name, @description, @criterion, 'ISO/IEC 27002:2022', @theme, 1)`,
    );

    for (const control of CONTROLES) {
      if (idsPorCodigo.has(control.code)) continue;
      const resultado = insertarControl.run({
        code: control.code,
        name: control.name,
        description: control.description,
        criterion: control.criterion,
        theme: control.theme,
      });
      idsPorCodigo.set(control.code, Number(resultado.lastInsertRowid));
    }

    const insertarAuditoria = db.prepare(
      `INSERT INTO audits (organization, objective, scope, audit_date, auditor_id, status)
       VALUES (@organization, @objective, @scope, @audit_date, @auditor_id, @status)`,
    );
    const abcId = Number(
      insertarAuditoria.run({ ...AUDITORIA_ABC, auditor_id: auditorId }).lastInsertRowid,
    );
    const pilotoId = Number(
      insertarAuditoria.run({ ...AUDITORIA_PILOTO, auditor_id: auditorId }).lastInsertRowid,
    );

    const insertarAuditControl = db.prepare(
      `INSERT INTO audit_controls (audit_id, control_id, status, observations, na_justification, evaluated_at)
       VALUES (@audit_id, @control_id, @status, @observations, @na_justification, @evaluated_at)`,
    );
    const filasPorControl = new Map<string, number>();

    for (const control of CONTROLES) {
      const controlId = idsPorCodigo.get(control.code);
      if (!controlId) throw new Error(`No se encontró el control ${control.code}`);

      filasPorControl.set(
        control.code,
        Number(
          insertarAuditControl
            .run({
              audit_id: abcId,
              control_id: controlId,
              status: control.estado,
              observations: control.observaciones,
              na_justification: control.justificacion ?? null,
              evaluated_at: FECHA_EVALUACION,
            }).lastInsertRowid,
        ),
      );

      insertarAuditControl.run({
        audit_id: pilotoId,
        control_id: controlId,
        status: "pendiente",
        observations: "",
        na_justification: null,
        evaluated_at: null,
      });
    }

    let referencia = 1;
    const insertarEvidencia = db.prepare(
      `INSERT INTO evidences (audit_control_id, description, source, evidence_date, reference, is_simulated)
       VALUES (?, ?, ?, '2026-02-12', ?, 1)`,
    );
    for (const [code, descripcion] of EVIDENCIAS) {
      const auditControlId = filasPorControl.get(code);
      if (!auditControlId) throw new Error(`No se encontró la fila de auditoría para ${code}`);
      const etiqueta = `EVD-ABC-${String(referencia).padStart(3, "0")}`;
      insertarEvidencia.run(auditControlId, descripcion, FUENTE_EVIDENCIA, etiqueta);
      referencia += 1;
    }

    const insertarHallazgo = db.prepare(
      `INSERT INTO findings (audit_control_id, audit_id, condition, criterion, cause, effect_risk, severity)
       VALUES (@audit_control_id, @audit_id, @condition, @criterion, @cause, @effect_risk, @severity)`,
    );
    const insertarRecomendacion = db.prepare(
      "INSERT INTO recommendations (finding_id, description, priority) VALUES (?, ?, ?)",
    );

    for (const hallazgo of HALLAZGOS) {
      const auditControlId = filasPorControl.get(hallazgo.code);
      if (!auditControlId) throw new Error(`No se encontró la fila de auditoría para ${hallazgo.code}`);
      const findingId = Number(
        insertarHallazgo
          .run({
            audit_control_id: auditControlId,
            audit_id: abcId,
            condition: hallazgo.condition,
            criterion: hallazgo.criterion,
            cause: hallazgo.cause,
            effect_risk: hallazgo.effect_risk,
            severity: hallazgo.severity,
          }).lastInsertRowid,
      );
      for (const recomendacion of hallazgo.recomendaciones) {
        insertarRecomendacion.run(
          findingId,
          recomendacion.description,
          recomendacion.priority,
        );
      }
    }
  })();

  console.log("Datos de demostración insertados correctamente.");
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
      `Usuarios creados: ${resultado.creados}; actualizados: ${resultado.actualizados}; total: ${resultado.total}.`,
    );

    const auditor = db
      .prepare("SELECT id, name, email, role FROM users WHERE email = ?")
      .get("auditor@auditsys.test") as Actor;
    seedDatos(db, auditor.id);
    imprimirConteos(db);
  } finally {
    db.close();
  }
}

main().catch((error: unknown) => {
  console.error("Error al ejecutar el seed:", error);
  process.exitCode = 1;
});

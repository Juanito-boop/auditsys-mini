# AuditSys Mini

Aplicación web académica para gestionar auditorías de seguridad de la información basadas en los controles del Anexo A de ISO/IEC 27001:2022: evaluación, evidencias, hallazgos, indicadores e informe imprimible. **No certifica organizaciones ni determina el cumplimiento normativo; el indicador no sustituye el juicio profesional del auditor.**

## Requisitos

- Node.js 20 o superior y npm.
- OpenSSL (para generar `AUTH_SECRET`).

## Instalación desde cero

```bash
npm install
cp .env.example .env.local
# genera el secreto y pégalo en AUTH_SECRET de .env.local:
openssl rand -base64 32
npm run seed
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

### Credenciales de demostración

| Usuario | Correo | Contraseña |
| --- | --- | --- |
| Administrador | `admin@auditsys.test` | `Auditoria2026!` |
| Auditor | `auditor@auditsys.test` | `Auditoria2026!` |

## Comandos

| Comando | Uso |
| --- | --- |
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Compilación de producción |
| `npm run start` | Servidor de producción (tras `build`) |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript sin emitir archivos |
| `npm test` | Vitest (3 archivos, 33 pruebas) |
| `npm run seed` | Datos demo idempotentes (Empresa ABC y Universidad Ejemplo) |

## Estructura y lógica de negocio

```text
src/
  app/
    (app)/               # páginas autenticadas: dashboard, audits, controls
    api/                 # route handlers (auth, audits, controls, evaluations,
                         # evidences, findings, recommendations, report, dashboard)
    login/, globals.css  # acceso y estilos/@media print
  components/            # Client Components: paneles de auditoría, gráficas, UI
  lib/                   # api-client, use-api, validación y utilidades de UI
  server/
    audits/ controls/ evaluations/ evidences/ findings/ reports/ dashboard/ auth/
      schemas.ts         # contratos Zod
      service.ts         # LÓGICA DE NEGOCIO Y SQL
    db/                  # conexión, DDL y tipos de filas
    lib/                 # compliance, errores, HTTP, constantes, serializers
  shared/                # tipos y textos compartidos cliente/servidor
scripts/seed.ts          # carga idempotente de datos de ejemplo
tests/                   # unitarios y de integración con SQLite en memoria
docs/DOCUMENTACION.md    # especificación completa
```

Las reglas de negocio están en los `service.ts` de `src/server/**`; las rutas solo validan con Zod, autentican y devuelven `{ data }` o `{ error: { code, message, details } }`.

## Seguridad

- Contraseñas con hash **bcrypt**; sesión con **JWT HS256 firmado con `jose`** en cookie **HttpOnly**, `sameSite=lax`, `secure` en producción y expiración configurable.
- `proxy.ts` hace solo una **redirección optimista** (comprueba que exista la cookie); la autoridad real son los guards de servidor `requireUser()`/`requireAdmin()`, que verifican el JWT en cada petición.
- `requireUser()` **revalida nombre, correo y rol contra la BD** en cada petición (la BD manda, no los claims del JWT) y devuelve **401** si el usuario ya no existe.
- El login ejecuta siempre un `compare` de bcrypt: si el correo no existe, usa un **hash señuelo** para mantener coste constante y no revelar qué cuentas están registradas.
- Un error 500 responde siempre `"Error interno del servidor."` sin detalle interno; el diagnóstico queda solo en la consola del servidor.
- `next.config.ts` incluye `allowedDevOrigins: ["127.0.0.1"]` para acceder al servidor de desarrollo por IP.
- **Roles** (`admin`, `auditor`) y **scope por auditor**: un auditor solo ve sus auditorías; las cerradas son de solo lectura (`assertOpen`).
- Validación de `body`, `params` y `query` con **Zod 4**, comprobaciones `CHECK` en SQLite y **consultas preparadas** (sin concatenar datos del usuario en SQL).
- Secretos en `.env.local`; `.env.local` y `data/` están ignorados por Git. Usa siempre un `AUTH_SECRET` aleatorio de al menos 32 bytes.

## Persistencia

SQLite en `data/auditsys.db` con `better-sqlite3`. El esquema se crea con `CREATE TABLE IF NOT EXISTS` al abrir la conexión: **no hay sistema de migraciones**. `npm run seed` es idempotente: si ya existe la auditoría demo, no reinserta datos y muestra los conteos actuales. Para empezar de cero, borra `data/auditsys.db` y vuelve a ejecutar `npm run seed`.

## Informe

La vista `/audits/[id]/report` y la pestaña de resultados incluyen el botón **Imprimir / Guardar como PDF**, que llama a `window.print()`. El diseño de impresión se controla con `@media print` y clases `print-hidden` en `src/app/globals.css`; **no se usa ninguna librería PDF**.

## Limitaciones

- Ejercicio académico: **no certifica** a ninguna organización ni determina el cumplimiento normativo.
- El indicador **no sustituye el juicio profesional**; los pendientes se muestran aparte y los no aplicables se excluyen del denominador.
- Todas las **evidencias son simuladas** (referencias, sin subida de archivos).
- Fuera de alcance: los 93 controles del Anexo A, pentest, SIEM, escaneo de vulnerabilidades real, multiusuario concurrente y generación de PDF en servidor.

## Documentación completa

Requisitos, casos de uso, modelo entidad-relación, arquitectura, prototipo de interfaces, informe de pruebas y guion de demo: [docs/DOCUMENTACION.md](docs/DOCUMENTACION.md).

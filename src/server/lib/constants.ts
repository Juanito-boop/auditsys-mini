import "server-only";

export {
  AVISO_NO_CERTIFICA,
  FORMULA,
  LIMITACIONES,
  REFERENTES,
} from "@/shared/constants";

/** Cookie de sesión; se lee del entorno para no endurecer un valor del .env.example. */
export const SESSION_COOKIE_NAME = process.env.SESSION_COOKIE_NAME ?? "auditsys_session";

const maxAgeConfigurado = Number(process.env.SESSION_MAX_AGE_SECONDS ?? "604800");
export const SESSION_MAX_AGE_SECONDS =
  Number.isFinite(maxAgeConfigurado) && maxAgeConfigurado > 0
    ? Math.floor(maxAgeConfigurado)
    : 604800;

export const METODOLOGIA =
  "Auditoría de seguridad de la información basada en los controles del Anexo A de ISO/IEC 27001:2022. " +
  "Cada control se evalúa con una evidencia simulada y, cuando procede, un hallazgo con su recomendación. " +
  "Los porcentajes se calculan sobre los controles evaluados y se informan por separado los pendientes y no aplicables. " +
  "Los resultados orientan la mejora continua y no sustituyen el juicio profesional del auditor.";

import { z } from "zod";
import type { ErrorBody, ErrorCode } from "@/shared/types";

export type ErrorDetail = { path: string; message: string };

/** Error HTTP de aplicación. Nunca expone stack traces en la respuesta. */
export class HttpError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly details?: ErrorDetail[];

  constructor(code: ErrorCode, status: number, message: string, details?: ErrorDetail[]) {
    super(message);
    this.name = "HttpError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export function badRequest(message = "La solicitud contiene datos inválidos.", details?: ErrorDetail[]): HttpError {
  return new HttpError("VALIDACION", 400, message, details);
}

export function unauthorized(message = "Debes iniciar sesión para continuar."): HttpError {
  return new HttpError("NO_AUTENTICADO", 401, message);
}

export function invalidCredentials(message = "Correo electrónico o contraseña incorrectos."): HttpError {
  return new HttpError("CREDENCIALES_INVALIDAS", 401, message);
}

export function forbidden(message = "No tienes permisos para realizar esta acción."): HttpError {
  return new HttpError("PROHIBIDO", 403, message);
}

export function notFound(message = "No se encontró el recurso solicitado."): HttpError {
  return new HttpError("NO_ENCONTRADO", 404, message);
}

export function conflict(message = "El recurso entra en conflicto con el estado actual."): HttpError {
  return new HttpError("CONFLICTO", 409, message);
}

export function internal(message = "Error interno del servidor."): HttpError {
  return new HttpError("ERROR_INTERNO", 500, message);
}

type ZodIssue = z.ZodError["issues"][number];

const TIPOS_ES: Record<string, string> = {
  string: "cadena",
  number: "número",
  int: "entero",
  safeint: "entero",
  boolean: "booleano",
  bigint: "entero grande",
  date: "fecha",
  array: "arreglo",
  object: "objeto",
  record: "objeto",
  tuple: "tupla",
  null: "nulo",
  undefined: "indefinido",
};

const MENSAJES_ZOD_INGLES = [
  /^Invalid input:/,
  /^Too small:/,
  /^Too big:/,
  /^Invalid option:/,
  /^Invalid format:/,
  /^Unrecognized key/i,
  /^Expected /,
];

function tipoLegible(valor: unknown): string {
  if (valor === undefined || valor === null) return String(valor);
  if (Array.isArray(valor)) return "arreglo";
  return TIPOS_ES[typeof valor] ?? typeof valor;
}

function mensajeIssue(issue: ZodIssue): string {
  // Respetamos mensajes personalizados (normalmente ya en español) de los schemas.
  if (!MENSAJES_ZOD_INGLES.some((pattern) => pattern.test(issue.message))) {
    return issue.message;
  }

  switch (issue.code) {
    case "invalid_type":
      return `Se esperaba ${TIPOS_ES[issue.expected] ?? issue.expected} y se recibió ${tipoLegible(issue.input)}.`;
    case "too_small": {
      if (issue.origin === "string") return `Debe tener al menos ${issue.minimum} caracteres.`;
      if (issue.origin === "array" || issue.origin === "set") {
        return `Debe contener al menos ${issue.minimum} elementos.`;
      }
      return `El valor debe ser ${issue.inclusive ? "mayor o igual" : "mayor"} que ${issue.minimum}.`;
    }
    case "too_big": {
      if (issue.origin === "string") return `Debe tener como máximo ${issue.maximum} caracteres.`;
      if (issue.origin === "array" || issue.origin === "set") {
        return `Debe contener como máximo ${issue.maximum} elementos.`;
      }
      return `El valor debe ser ${issue.inclusive ? "menor o igual" : "menor"} que ${issue.maximum}.`;
    }
    case "invalid_format":
      return `El formato del valor no es válido (${issue.format}).`;
    case "invalid_value":
      return `El valor debe ser uno de: ${issue.values.map((valor) => String(valor)).join(", ")}.`;
    case "unrecognized_keys":
      return `No se permiten claves adicionales: ${issue.keys.join(", ")}.`;
    case "not_multiple_of":
      return `El valor debe ser múltiplo de ${issue.divisor}.`;
    case "invalid_union":
      return "El valor no coincide con ninguna de las opciones permitidas.";
    case "invalid_key":
    case "invalid_element":
      return "Una clave o elemento del valor no es válido.";
    default:
      return "El valor no es válido.";
  }
}

/** Convierte un ZodError de Zod 4 en un HttpError de validación con details en español. */
export function fromZodError(error: z.ZodError): HttpError {
  const details: ErrorDetail[] = error.issues.map((issue) => ({
    path: issue.path.map((segmento) => String(segmento)).join(".") || "(raíz)",
    message: mensajeIssue(issue),
  }));
  return badRequest("La solicitud contiene datos inválidos.", details);
}

/** Serializa cualquier error a un Response JSON seguro. */
export function toErrorResponse(error: unknown): Response {
  const httpError =
    error instanceof HttpError ? error : error instanceof z.ZodError ? fromZodError(error) : internal();

  const esInterno = httpError.code === "ERROR_INTERNO";
  if (esInterno) {
    // Diagnóstico solo en el servidor; jamás en el cuerpo de la respuesta.
    console.error("[ERROR_INTERNO]", error);
  }

  const body: ErrorBody = {
    error: {
      code: httpError.code,
      message: esInterno ? "Error interno del servidor." : httpError.message,
      ...(!esInterno && httpError.details?.length ? { details: httpError.details } : {}),
    },
  };
  return Response.json(body, { status: httpError.status });
}

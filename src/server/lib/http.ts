import type { z } from "zod";
import type { Success } from "@/shared/types";
import { badRequest, fromZodError } from "./errors";

type Origen = "body" | "params" | "query";

function validar<T>(schema: z.ZodType<T>, valor: unknown, origen: Origen): T {
  const resultado = schema.safeParse(valor);
  if (resultado.success) return resultado.data;

  const error = fromZodError(resultado.error);
  const details = error.details?.map((detalle) => ({
    path: detalle.path === "(raíz)" ? origen : `${origen}.${detalle.path}`,
    message: detalle.message,
  }));
  throw badRequest(error.message, details);
}

/** Parsea y valida el cuerpo JSON de una Request. */
export async function parseBody<T>(request: Request, schema: z.ZodType<T>): Promise<T> {
  let valor: unknown;
  try {
    valor = await request.json();
  } catch {
    throw badRequest("El cuerpo de la solicitud debe ser JSON válido.", [
      { path: "body", message: "No se pudo interpretar el JSON." },
    ]);
  }
  return validar(schema, valor, "body");
}

/** Parsea y valida los parámetros de ruta (en Next 16 son una Promise). */
export async function parseParams<T>(params: Promise<unknown> | unknown, schema: z.ZodType<T>): Promise<T> {
  let valor: unknown;
  try {
    valor = await params;
  } catch {
    throw badRequest("No se pudieron leer los parámetros de la ruta.", [
      { path: "params", message: "Parámetros no disponibles." },
    ]);
  }
  return validar(schema, valor, "params");
}

/** Parsea y valida la query string de una URL absoluta. */
export function parseQuery<T>(url: string | URL, schema: z.ZodType<T>): T {
  let parametros: URLSearchParams;
  try {
    parametros = new URL(url.toString()).searchParams;
  } catch {
    throw badRequest("La URL de la solicitud no es válida.", [
      { path: "query", message: "URL no válida." },
    ]);
  }

  const valor: Record<string, string> = {};
  for (const [clave, contenido] of parametros) valor[clave] = contenido;
  return validar(schema, valor, "query");
}

/** Respuesta JSON consistente: { data, message? }. */
export function jsonSuccess<T>(data: T, status = 200, message?: string): Response {
  const cuerpo: Success<T> = message ? { data, message } : { data };
  return Response.json(cuerpo, { status });
}

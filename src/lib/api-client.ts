/** Cliente HTTP tipado para el API interno. Solo se usa en el navegador. */

import type { ErrorBody } from "@/shared/types";

export interface ApiDetail {
  path: string;
  message: string;
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: ApiDetail[];

  constructor(status: number, code: string, message: string, details?: ApiDetail[]) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const LOGIN_PATH = "/api/auth/login";

function redirigirSiSesionExpirada(path: string, status: number): void {
  if (status !== 401 || path === LOGIN_PATH) return;
  if (typeof window === "undefined") return;
  if (window.location.pathname.startsWith("/login")) return;
  window.location.assign(new URL("/login", window.location.origin).href);
}

/**
 * Realiza una petición al API y devuelve únicamente el campo `data` de la
 * respuesta. Los errores del backend se convierten en `ApiError`.
 */
export async function apiClient<T>(path: string, options: RequestInit = {}): Promise<T> {
  const { headers: headersInit, body, ...rest } = options;
  const headers = new Headers(headersInit);

  if (body !== undefined && body !== null && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  let response: Response;
  try {
    response = await fetch(path, {
      ...rest,
      headers,
      body,
      credentials: "same-origin",
    });
  } catch {
    throw new ApiError(0, "ERROR_RED", "No se pudo conectar con el servidor. Comprueba tu conexión.");
  }

  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    // Una respuesta sin JSON se trata como error de formato más abajo.
  }

  if (!response.ok) {
    const info = (payload as ErrorBody | null)?.error;
    const code = info?.code ?? (response.status === 401 ? "NO_AUTENTICADO" : "ERROR_INTERNO");
    const message =
      info?.message ??
      (response.status === 401
        ? "Tu sesión ha caducado. Inicia sesión de nuevo."
        : "Ocurrió un error inesperado. Inténtalo de nuevo.");

    redirigirSiSesionExpirada(path, response.status);
    throw new ApiError(response.status, code, message, info?.details);
  }

  if (payload === null || typeof payload !== "object" || !("data" in payload)) {
    throw new ApiError(response.status, "ERROR_INTERNO", "El servidor devolvió una respuesta inesperada.");
  }

  return (payload as { data: T }).data;
}

type OpcionesSinCuerpo = Omit<RequestInit, "method" | "body">;

export function apiGet<T>(path: string, options: OpcionesSinCuerpo = {}): Promise<T> {
  return apiClient<T>(path, { ...options, method: "GET" });
}

export function apiPost<T>(path: string, body?: unknown, options: OpcionesSinCuerpo = {}): Promise<T> {
  return apiClient<T>(path, {
    ...options,
    method: "POST",
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

export function apiPut<T>(path: string, body?: unknown, options: OpcionesSinCuerpo = {}): Promise<T> {
  return apiClient<T>(path, {
    ...options,
    method: "PUT",
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

export function apiPatch<T>(path: string, body?: unknown, options: OpcionesSinCuerpo = {}): Promise<T> {
  return apiClient<T>(path, {
    ...options,
    method: "PATCH",
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

export function apiDelete<T>(path: string, options: OpcionesSinCuerpo = {}): Promise<T> {
  return apiClient<T>(path, { ...options, method: "DELETE" });
}

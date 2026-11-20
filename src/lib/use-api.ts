/** Hook de carga de recursos del API con estados explícitos y reintento. */

"use client";

import { useCallback, useEffect, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { apiGet } from "./api-client";
import { mensajeError } from "./ui";

export interface ApiResource<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
  setData: Dispatch<SetStateAction<T | null>>;
}

/**
 * Carga `path` con `apiGet`. Si `path` es null no se hace ninguna petición, lo
 * que permite condicionar cargas a permisos o a datos previos.
 */
export function useApiResource<T>(path: string | null): ApiResource<T> {
  const [data, setData] = useState<T | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    if (path === null) return;

    let activo = true;
    const cargar = async () => {
      setCargando(true);
      setError(null);
      try {
        const datos = await apiGet<T>(path);
        if (activo) setData(datos);
      } catch (err: unknown) {
        if (activo) setError(mensajeError(err));
      } finally {
        if (activo) setCargando(false);
      }
    };

    void cargar();
    return () => {
      activo = false;
    };
  }, [path, intento]);

  const reload = useCallback(() => setIntento((valor) => valor + 1), []);

  return {
    data,
    loading: path !== null && cargando,
    error: path !== null ? error : null,
    reload,
    setData,
  };
}

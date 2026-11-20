"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { AppShell } from "@/components/AppShell";
import { ErrorState } from "@/components/ui/ErrorState";
import { Loading } from "@/components/ui/Loading";
import { ApiError, apiGet } from "@/lib/api-client";
import type { UserDTO } from "@/shared/types";

export default function AppLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [usuario, setUsuario] = useState<UserDTO | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    apiGet<UserDTO>("/api/auth/me").then(
      (datos) => {
        setUsuario(datos);
        setCargando(false);
      },
      (err: unknown) => {
        if (err instanceof ApiError && err.status === 401) {
          router.replace("/login");
          return;
        }
        setError(err instanceof Error ? err.message : "No se pudo verificar la sesión.");
        setCargando(false);
      },
    );
  }, [router, intento]);

  const reintentar = () => {
    setCargando(true);
    setError(null);
    setIntento((valor) => valor + 1);
  };

  if (cargando) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <Loading label="Verificando sesión…" fullPage />
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-lg">
          <ErrorState
            title="No se pudo cargar la aplicación"
            message={error}
            onRetry={reintentar}
          />
        </div>
      </main>
    );
  }

  if (!usuario) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <Loading label="Redirigiendo al inicio de sesión…" fullPage />
      </main>
    );
  }

  return <AppShell user={usuario}>{children}</AppShell>;
}

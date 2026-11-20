"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ErrorState } from "@/components/ui/ErrorState";
import { Loading } from "@/components/ui/Loading";
import { ApiError, apiGet } from "@/lib/api-client";
import type { UserDTO } from "@/shared/types";

export default function Home() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    apiGet<UserDTO>("/api/auth/me").then(
      () => {
        router.replace("/dashboard");
      },
      (err: unknown) => {
        if (err instanceof ApiError && err.status === 401) {
          router.replace("/login");
          return;
        }
        setError(err instanceof Error ? err.message : "No se pudo comprobar la sesión.");
      },
    );
  }, [router, intento]);

  const reintentar = () => {
    setError(null);
    setIntento((valor) => valor + 1);
  };

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md">
        {error ? (
          <ErrorState title="No se pudo comprobar la sesión" message={error} onRetry={reintentar} />
        ) : (
          <Loading label="Comprobando la sesión…" />
        )}
      </div>
    </main>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { ErrorState } from "@/components/ui/ErrorState";
import { Loading } from "@/components/ui/Loading";
import { apiGet } from "@/lib/api-client";
import type { UserDTO } from "@/shared/types";

const CLASE_ENLACE =
  "inline-flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 hover:border-slate-400 hover:bg-slate-50";

export default function DashboardPage() {
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
        setError(err instanceof Error ? err.message : "No se pudo cargar tu información.");
        setCargando(false);
      },
    );
  }, [intento]);

  const reintentar = () => {
    setCargando(true);
    setError(null);
    setIntento((valor) => valor + 1);
  };

  if (cargando) return <Loading label="Cargando el panel…" />;

  if (error) {
    return (
      <div className="mx-auto max-w-xl">
        <ErrorState title="No se pudo cargar el panel" message={error} onRetry={reintentar} />
      </div>
    );
  }

  if (!usuario) return <Loading label="Cargando el panel…" />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Hola, {usuario.name}</h1>
        <p className="mt-1 text-sm text-slate-600">Panel de control</p>
      </div>

      <Card className="p-5 sm:p-6">
        <h2 className="text-base font-semibold text-slate-900">Accesos rápidos</h2>
        <ul className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <li className="sm:min-w-[12rem] sm:flex-1">
            <Link href="/audits" className={`${CLASE_ENLACE} w-full`}>
              Auditorías <span aria-hidden="true">→</span>
            </Link>
          </li>
          {usuario.role === "admin" ? (
            <li className="sm:min-w-[12rem] sm:flex-1">
              <Link href="/controls" className={`${CLASE_ENLACE} w-full`}>
                Catálogo de controles <span aria-hidden="true">→</span>
              </Link>
            </li>
          ) : null}
        </ul>
      </Card>

      <p className="text-sm text-slate-600">El panel de indicadores se cargará desde /api/dashboard</p>
      <p className="text-xs text-slate-500">No certifica ni determina el cumplimiento normativo.</p>
    </div>
  );
}

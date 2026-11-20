"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { apiPost } from "@/lib/api-client";
import { cx } from "@/lib/ui";
import type { UserDTO } from "@/shared/types";
import { Button } from "./ui/Button";
import { Toast } from "./ui/Toast";

const AVISO_SIDEBAR = "No certifica ni determina el cumplimiento normativo";

interface Enlace {
  href: string;
  label: string;
  soloAdmin?: boolean;
}

const ENLACES: Enlace[] = [
  { href: "/dashboard", label: "Panel de control" },
  { href: "/audits", label: "Auditorías" },
  { href: "/controls", label: "Catálogo de controles", soloAdmin: true },
];

function tituloSeccion(pathname: string): string {
  if (pathname.startsWith("/audits")) return "Auditorías";
  if (pathname.startsWith("/controls")) return "Catálogo de controles";
  if (pathname.startsWith("/dashboard")) return "Panel de control";
  return "AuditSys Mini";
}

function etiquetaRol(role: UserDTO["role"]): string {
  return role === "admin" ? "Administrador" : "Auditor";
}

function claseEnlace(activo: boolean, grande = false): string {
  return cx(
    "block rounded-lg font-medium transition-colors",
    grande ? "px-4 py-3 text-base" : "px-3 py-2.5 text-sm",
    activo
      ? "bg-slate-900 text-white"
      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
  );
}

function Marca() {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-white">
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3z" />
          <path d="M9 12l2 2 4-4" />
        </svg>
      </span>
      <span className="truncate text-sm font-semibold tracking-tight text-slate-900">AuditSys Mini</span>
    </div>
  );
}

export interface AppShellProps {
  user: UserDTO;
  children: React.ReactNode;
}

export function AppShell({ user, children }: AppShellProps) {
  const pathname = usePathname() ?? "";
  const router = useRouter();
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [cerrando, setCerrando] = useState(false);
  const [aviso, setAviso] = useState<{ mensaje: string; tone: "success" | "error" } | null>(null);

  const enlaces = ENLACES.filter((enlace) => !enlace.soloAdmin || user.role === "admin");
  const titulo = tituloSeccion(pathname);

  const cerrarSesion = async () => {
    setCerrando(true);
    try {
      await apiPost<{ ok: boolean }>("/api/auth/logout");
      router.replace("/login");
      router.refresh();
    } catch (error) {
      setAviso({
        mensaje: error instanceof Error ? error.message : "No se pudo cerrar la sesión.",
        tone: "error",
      });
    } finally {
      setCerrando(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-slate-200 bg-white md:flex lg:w-72">
        <div className="flex h-16 items-center border-b border-slate-200 px-5">
          <Marca />
        </div>
        <nav aria-label="Navegación principal" className="flex-1 space-y-1 overflow-y-auto px-3 py-5">
          {enlaces.map((enlace) => {
            const activo = pathname === enlace.href || pathname.startsWith(`${enlace.href}/`);
            return (
              <Link
                key={enlace.href}
                href={enlace.href}
                aria-current={activo ? "page" : undefined}
                className={claseEnlace(activo)}
              >
                {enlace.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-slate-200 px-5 py-4">
          <p className="text-xs leading-relaxed text-slate-500">{AVISO_SIDEBAR}</p>
        </div>
      </aside>

      {menuAbierto ? (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-slate-900/40"
            onClick={() => setMenuAbierto(false)}
          />
          <div
            id="menu-movil"
            className="absolute inset-y-0 left-0 flex w-[85%] max-w-xs flex-col bg-white shadow-xl"
          >
            <div className="flex h-14 items-center justify-between border-b border-slate-200 px-4">
              <Marca />
              <button
                type="button"
                onClick={() => setMenuAbierto(false)}
                aria-label="Cerrar menú"
                className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"
              >
                <svg viewBox="0 0 20 20" aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M5 5l10 10M15 5L5 15" />
                </svg>
              </button>
            </div>
            <nav aria-label="Navegación móvil" className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
              {enlaces.map((enlace) => {
                const activo = pathname === enlace.href || pathname.startsWith(`${enlace.href}/`);
                return (
                  <Link
                    key={enlace.href}
                    href={enlace.href}
                    aria-current={activo ? "page" : undefined}
                    className={claseEnlace(activo, true)}
                    onClick={() => setMenuAbierto(false)}
                  >
                    {enlace.label}
                  </Link>
                );
              })}
            </nav>
            <div className="border-t border-slate-200 px-4 py-4">
              <p className="text-xs leading-relaxed text-slate-500">{AVISO_SIDEBAR}</p>
            </div>
          </div>
        </div>
      ) : null}

      <div className="min-w-0 md:pl-64 lg:pl-72">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
          <div className="flex h-14 items-center gap-2 px-4 sm:h-16 sm:px-6 lg:px-8">
            <button
              type="button"
              onClick={() => setMenuAbierto(true)}
              aria-label="Abrir menú"
              aria-expanded={menuAbierto}
              aria-controls="menu-movil"
              className="shrink-0 rounded-lg p-2 text-slate-700 hover:bg-slate-100 md:hidden"
            >
              <svg viewBox="0 0 20 20" aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M3 5h14M3 10h14M3 15h14" />
              </svg>
            </button>
            <div className="min-w-0 flex-1 sm:hidden">
              <Marca />
            </div>
            <div className="hidden min-w-0 flex-1 sm:block">
              <p className="truncate text-base font-semibold text-slate-900">{titulo}</p>
            </div>
            <div className="hidden shrink-0 text-right sm:block">
              <p className="max-w-[14rem] truncate text-sm font-medium text-slate-800">{user.name}</p>
              <p className="text-xs text-slate-500">{etiquetaRol(user.role)}</p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              loading={cerrando}
              onClick={cerrarSesion}
              className="shrink-0 px-2 sm:px-3"
            >
              Cerrar sesión
            </Button>
          </div>
          <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-4 py-2 sm:hidden">
            <p className="min-w-0 truncate text-sm font-semibold text-slate-900">{titulo}</p>
            <p className="min-w-0 shrink truncate text-xs text-slate-500">
              {user.name} · {etiquetaRol(user.role)}
            </p>
          </div>
        </header>

        <main className="mx-auto w-full min-w-0 max-w-[1280px] px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>

      {aviso ? <Toast message={aviso.mensaje} tone={aviso.tone} onClose={() => setAviso(null)} /> : null}
    </div>
  );
}

export default AppShell;

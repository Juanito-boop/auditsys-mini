"use client";

import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { ApiError, apiPost } from "@/lib/api-client";
import type { UserDTO } from "@/shared/types";

type Errores = { email?: string; password?: string };

function validar(email: string, password: string): Errores {
  const errores: Errores = {};
  const correo = email.trim();

  if (!correo) {
    errores.email = "Introduce tu correo electrónico.";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
    errores.email = "Introduce un correo electrónico válido.";
  }

  if (!password) errores.password = "Introduce tu contraseña.";

  return errores;
}

function erroresDelServidor(error: ApiError): Errores {
  const errores: Errores = {};
  for (const detalle of error.details ?? []) {
    const campo = detalle.path.split(".").pop();
    if (campo === "email" || campo === "password") errores[campo] = detalle.message;
  }
  return errores;
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errores, setErrores] = useState<Errores>({});
  const [errorServidor, setErrorServidor] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const enviar = async (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    const erroresLocales = validar(email, password);
    setErrores(erroresLocales);
    setErrorServidor(null);

    if (Object.keys(erroresLocales).length > 0) {
      document.getElementById(erroresLocales.email ? "email" : "password")?.focus();
      return;
    }

    setEnviando(true);
    try {
      await apiPost<UserDTO>("/api/auth/login", { email: email.trim(), password });
      router.replace("/dashboard");
      router.refresh();
    } catch (error) {
      if (error instanceof ApiError) {
        setErrores(erroresDelServidor(error));
        setErrorServidor(error.message);
      } else {
        setErrorServidor("No se pudo iniciar sesión. Inténtalo de nuevo.");
      }
    } finally {
      setEnviando(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-md">
        <Card className="p-6 sm:p-8">
          <div className="mb-6">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">AuditSys Mini</h1>
            <p className="mt-1 text-sm text-slate-600">Auditoría de seguridad de la información</p>
          </div>

          <form onSubmit={enviar} noValidate className="space-y-4">
            <Field
              id="email"
              label="Correo electrónico"
              type="email"
              autoComplete="email"
              placeholder="nombre@organizacion.test"
              value={email}
              onChange={(evento) => setEmail(evento.target.value)}
              error={errores.email}
              disabled={enviando}
            />
            <Field
              id="password"
              label="Contraseña"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(evento) => setPassword(evento.target.value)}
              error={errores.password}
              disabled={enviando}
            />

            {errorServidor ? (
              <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                {errorServidor}
              </div>
            ) : null}

            <Button type="submit" loading={enviando} className="w-full">
              {enviando ? "Iniciando sesión…" : "Iniciar sesión"}
            </Button>
          </form>

          <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
            <p className="font-medium text-slate-700">Credenciales de demostración</p>
            <p className="mt-1 break-words">admin@auditsys.test · auditor@auditsys.test</p>
            <p className="mt-0.5">Contraseña: Auditoria2026!</p>
          </div>
        </Card>

        <p className="mt-4 text-center text-xs text-slate-500">
          Ejercicio académico. La herramienta no certifica organizaciones.
        </p>
      </div>
    </main>
  );
}

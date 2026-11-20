/** Listado de auditorías con filtro por estado y alta desde un modal. */

"use client";

import Link from "next/link";
import { useSyncExternalStore, useState } from "react";
import { AuditForm, type AuditoriaFormData } from "@/components/audits/AuditForm";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ErrorState } from "@/components/ui/ErrorState";
import { SelectField } from "@/components/ui/FormControls";
import { Loading } from "@/components/ui/Loading";
import { Modal } from "@/components/ui/Modal";
import { Toast } from "@/components/ui/Toast";
import { ToneBadge, tonoAuditoria } from "@/components/ui/ToneBadge";
import { apiPost } from "@/lib/api-client";
import { useApiResource } from "@/lib/use-api";
import { formatDate, mensajeError, statusLabel, type Aviso } from "@/lib/ui";
import {
  AUDIT_STATUS_LABELS,
} from "@/shared/constants";
import type { AuditDTO, AuditStatus, UserDTO } from "@/shared/types";

type Filtro = "todos" | AuditStatus;

const OPCIONES_FILTRO = [
  { value: "todos", label: "Todos" },
  ...Object.entries(AUDIT_STATUS_LABELS).map(([value, label]) => ({ value, label })),
];

function suscribirACambiosDeUrl(callback: () => void): () => void {
  window.addEventListener("popstate", callback);
  return () => window.removeEventListener("popstate", callback);
}

function crearSolicitadoDesdeUrl(): boolean {
  return typeof window !== "undefined" && new URLSearchParams(window.location.search).get("crear") === "1";
}

function crearSolicitadoEnServidor(): boolean {
  return false;
}

function BarraProgreso({ evaluados, total }: { evaluados: number; total: number }) {
  const porcentaje = total ? Math.round((evaluados / total) * 100) : 0;
  return (
    <div className="w-full min-w-0">
      <div className="flex items-center justify-between gap-2 text-xs text-slate-600">
        <span>{evaluados} de {total} evaluados</span>
        <span className="tabular-nums">{porcentaje} %</span>
      </div>
      <div
        role="progressbar"
        aria-label="Controles evaluados"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={evaluados}
        className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-100"
      >
        <div className="h-full rounded-full bg-slate-700" style={{ width: `${porcentaje}%` }} />
      </div>
    </div>
  );
}

export default function AuditsPage() {
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [modalManual, setModalManual] = useState(false);
  const [crearDescartado, setCrearDescartado] = useState(false);
  const [aviso, setAviso] = useState<Aviso | null>(null);
  const crearDeUrl = useSyncExternalStore(
    suscribirACambiosDeUrl,
    crearSolicitadoDesdeUrl,
    crearSolicitadoEnServidor,
  );
  const modalAbierta = modalManual || (crearDeUrl && !crearDescartado);
  const ruta = filtro === "todos" ? "/api/audits" : `/api/audits?status=${filtro}`;

  const usuario = useApiResource<UserDTO>("/api/auth/me");
  const auditorias = useApiResource<AuditDTO[]>(ruta);

  const abrirModal = () => {
    setCrearDescartado(false);
    setModalManual(true);
  };
  const cerrarModal = () => {
    setCrearDescartado(true);
    setModalManual(false);
  };

  const crear = async (datos: AuditoriaFormData) => {
    try {
      await apiPost<AuditDTO>("/api/audits", datos);
      cerrarModal();
      setAviso({ mensaje: "Auditoría creada correctamente.", tone: "success" });
      auditorias.reload();
    } catch (error) {
      setAviso({ mensaje: mensajeError(error), tone: "error" });
      throw error;
    }
  };

  if (usuario.loading) return <Loading label="Cargando tu información…" />;

  if (usuario.error) {
    return (
      <div className="mx-auto max-w-xl">
        <ErrorState
          title="No se pudo cargar tu información"
          message={usuario.error}
          onRetry={usuario.reload}
        />
      </div>
    );
  }

  if (!usuario.data) return <Loading label="Cargando tu información…" />;

  const esAdmin = usuario.data.role === "admin";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Auditorías</h1>
          <p className="mt-1 text-sm text-slate-600">Gestiona las auditorías y su avance.</p>
        </div>
        <Button
          className="print-hidden w-full sm:w-auto"
          onClick={abrirModal}
        >
          Nueva auditoría
        </Button>
      </div>

      <Card className="p-4 sm:p-5">
        <div className="sm:max-w-xs">
          <SelectField
            id="filtro-estado"
            label="Filtrar por estado"
            value={filtro}
            onChange={(valor) => setFiltro(valor as Filtro)}
            options={OPCIONES_FILTRO}
          />
        </div>
      </Card>

      {auditorias.loading ? <Loading label="Cargando auditorías…" /> : null}

      {!auditorias.loading && auditorias.error ? (
        <ErrorState
          title="No se pudieron cargar las auditorías"
          message={auditorias.error}
          onRetry={auditorias.reload}
        />
      ) : null}

      {!auditorias.loading && !auditorias.error && auditorias.data?.length === 0 ? (
        <Card className="p-6 sm:p-8">
          <h2 className="text-base font-semibold text-slate-900">No hay auditorías</h2>
          <p className="mt-2 text-sm text-slate-600">
            {filtro === "todos"
              ? "Crea una auditoría para empezar a evaluar controles."
              : `No hay auditorías en estado ${statusLabel(filtro)}.`}
          </p>
        </Card>
      ) : null}

      {!auditorias.loading && !auditorias.error && auditorias.data?.length ? (
        <>
          <div className="hidden overflow-x-auto md:block">
            <Card className="min-w-[720px]">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                    <th scope="col" className="px-4 py-3 font-medium">Organización</th>
                    <th scope="col" className="px-4 py-3 font-medium">Auditor</th>
                    <th scope="col" className="px-4 py-3 font-medium">Fecha</th>
                    <th scope="col" className="px-4 py-3 font-medium">Estado</th>
                    <th scope="col" className="px-4 py-3 font-medium">Progreso</th>
                    <th scope="col" className="px-4 py-3 text-right font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {auditorias.data.map((auditoria) => (
                    <tr key={auditoria.id} className="border-b border-slate-100 last:border-0">
                      <td className="px-4 py-3 font-medium text-slate-900">{auditoria.organization}</td>
                      <td className="px-4 py-3 text-slate-700">{auditoria.auditor_name}</td>
                      <td className="px-4 py-3 text-slate-600">{formatDate(auditoria.audit_date)}</td>
                      <td className="px-4 py-3">
                        <ToneBadge tone={tonoAuditoria(auditoria.status)}>
                          {statusLabel(auditoria.status)}
                        </ToneBadge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="w-40">
                          <BarraProgreso
                            evaluados={auditoria.progress.evaluados}
                            total={auditoria.progress.total}
                          />
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/audits/${auditoria.id}`}
                          className="inline-flex h-9 items-center rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-800 hover:bg-slate-50"
                        >
                          Ver detalle
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </div>

          <ul className="space-y-3 md:hidden">
            {auditorias.data.map((auditoria) => (
              <li key={auditoria.id}>
                <Card className="p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p className="min-w-0 break-words font-semibold text-slate-900">
                      {auditoria.organization}
                    </p>
                    <ToneBadge tone={tonoAuditoria(auditoria.status)}>
                      {statusLabel(auditoria.status)}
                    </ToneBadge>
                  </div>
                  <dl className="mt-3 space-y-1 text-sm text-slate-600">
                    <div className="flex justify-between gap-3">
                      <dt>Auditor</dt>
                      <dd className="min-w-0 break-words text-right text-slate-800">{auditoria.auditor_name}</dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt>Fecha</dt>
                      <dd className="text-slate-800">{formatDate(auditoria.audit_date)}</dd>
                    </div>
                  </dl>
                  <div className="mt-3">
                    <BarraProgreso
                      evaluados={auditoria.progress.evaluados}
                      total={auditoria.progress.total}
                    />
                  </div>
                  <Link
                    href={`/audits/${auditoria.id}`}
                    className="mt-3 inline-flex h-9 w-full items-center justify-center rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-800 hover:bg-slate-50"
                  >
                    Ver detalle
                  </Link>
                </Card>
              </li>
            ))}
          </ul>
        </>
      ) : null}

      <Modal
        open={modalAbierta}
        title="Nueva auditoría"
        onClose={cerrarModal}
        ancho="lg"
      >
        <AuditForm
          esAdmin={esAdmin}
          onSubmit={crear}
          onCancel={cerrarModal}
          submitLabel="Crear auditoría"
        />
      </Modal>

      {aviso ? <Toast message={aviso.mensaje} tone={aviso.tone} onClose={() => setAviso(null)} /> : null}
    </div>
  );
}

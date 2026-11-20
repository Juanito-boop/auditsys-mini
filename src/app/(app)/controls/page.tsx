/** Catálogo de controles: solo administradores pueden consultarlo y editarlo. */

"use client";

import { useState } from "react";
import { ControlForm, type ControlFormData } from "@/components/audits/controls/ControlForm";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ErrorState } from "@/components/ui/ErrorState";
import { Loading } from "@/components/ui/Loading";
import { Modal } from "@/components/ui/Modal";
import { Toast } from "@/components/ui/Toast";
import { ToneBadge } from "@/components/ui/ToneBadge";
import { apiPost, apiPut } from "@/lib/api-client";
import { useApiResource } from "@/lib/use-api";
import { mensajeError, statusLabel, type Aviso } from "@/lib/ui";
import type { ControlDTO, UserDTO } from "@/shared/types";

export default function ControlsPage() {
  const usuario = useApiResource<UserDTO>("/api/auth/me");
  const esAdmin = usuario.data?.role === "admin";
  const controles = useApiResource<ControlDTO[]>(esAdmin ? "/api/controls" : null);
  const [modal, setModal] = useState<{ abierta: boolean; control: ControlDTO | null }>({
    abierta: false,
    control: null,
  });
  const [aAlternar, setAAlternar] = useState<ControlDTO | null>(null);
  const [aviso, setAviso] = useState<Aviso | null>(null);

  const abrirAlta = () => setModal({ abierta: true, control: null });
  const abrirEdicion = (control: ControlDTO) => setModal({ abierta: true, control });

  const onError = (error: unknown) => {
    setAviso({ mensaje: mensajeError(error), tone: "error" });
  };

  const guardar = async (datos: ControlFormData) => {
    try {
      if (modal.control) {
        await apiPut<ControlDTO>(`/api/controls/${modal.control.id}`, datos);
        setAviso({ mensaje: "Control actualizado correctamente.", tone: "success" });
      } else {
        await apiPost<ControlDTO>("/api/controls", datos);
        setAviso({ mensaje: "Control creado correctamente.", tone: "success" });
      }
      setModal({ abierta: false, control: null });
      controles.reload();
    } catch (error) {
      onError(error);
      throw error;
    }
  };

  const alternar = async () => {
    if (!aAlternar) return;
    const body: ControlFormData = {
      code: aAlternar.code,
      name: aAlternar.name,
      description: aAlternar.description,
      criterion: aAlternar.criterion,
      source: aAlternar.source,
      theme: aAlternar.theme,
      active: !aAlternar.active,
    };
    try {
      await apiPut<ControlDTO>(`/api/controls/${aAlternar.id}`, body);
      setAviso({
        mensaje: aAlternar.active ? "Control desactivado correctamente." : "Control activado correctamente.",
        tone: "success",
      });
      setAAlternar(null);
      controles.reload();
    } catch (error) {
      onError(error);
      setAAlternar(null);
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

  if (!esAdmin) {
    return (
      <Card className="mx-auto max-w-xl p-6 sm:p-8">
        <h1 className="text-xl font-semibold text-slate-900">Sin permisos</h1>
        <p className="mt-2 text-sm text-slate-600">
          El catálogo de controles solo puede ser consultado y modificado por administradores.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Catálogo de controles</h1>
          <p className="mt-1 text-sm text-slate-600">
            Controles de referencia utilizados en las evaluaciones.
          </p>
        </div>
        <Button className="print-hidden w-full sm:w-auto" onClick={abrirAlta}>
          Nuevo control
        </Button>
      </div>

      {controles.loading ? <Loading label="Cargando controles…" /> : null}

      {!controles.loading && controles.error ? (
        <ErrorState
          title="No se pudo cargar el catálogo"
          message={controles.error}
          onRetry={controles.reload}
        />
      ) : null}

      {!controles.loading && !controles.error && controles.data?.length === 0 ? (
        <Card className="p-6 sm:p-8">
          <h2 className="text-base font-semibold text-slate-900">No hay controles</h2>
          <p className="mt-1 text-sm text-slate-600">Crea el primer control del catálogo.</p>
        </Card>
      ) : null}

      {!controles.loading && !controles.error && controles.data?.length ? (
        <div className="overflow-x-auto">
          <Card className="min-w-[900px]">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                  <th scope="col" className="px-4 py-3 font-medium">Código</th>
                  <th scope="col" className="px-4 py-3 font-medium">Nombre</th>
                  <th scope="col" className="px-4 py-3 font-medium">Tema</th>
                  <th scope="col" className="px-4 py-3 font-medium">Descripción</th>
                  <th scope="col" className="px-4 py-3 font-medium">Criterio</th>
                  <th scope="col" className="px-4 py-3 font-medium">Estado</th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {controles.data.map((control) => (
                  <tr key={control.id} className="border-b border-slate-100 align-top last:border-0">
                    <td className="px-4 py-3 font-medium tabular-nums text-slate-900">{control.code}</td>
                    <td className="px-4 py-3 text-slate-800">{control.name}</td>
                    <td className="px-4 py-3 text-slate-600">{statusLabel(control.theme)}</td>
                    <td className="max-w-xs px-4 py-3 text-slate-600">{control.description}</td>
                    <td className="max-w-xs px-4 py-3 text-slate-600">{control.criterion}</td>
                    <td className="px-4 py-3">
                      <ToneBadge tone={control.active ? "success" : "neutral"}>
                        {control.active ? "Activo" : "Inactivo"}
                      </ToneBadge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="ghost" onClick={() => abrirEdicion(control)}>
                          Editar
                        </Button>
                        <Button size="sm" variant="secondary" onClick={() => setAAlternar(control)}>
                          {control.active ? "Desactivar" : "Activar"}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      ) : null}

      <Modal
        open={modal.abierta}
        title={modal.control ? "Editar control" : "Nuevo control"}
        onClose={() => setModal({ abierta: false, control: null })}
        ancho="lg"
      >
        <ControlForm
          initial={modal.control}
          onSubmit={guardar}
          onCancel={() => setModal({ abierta: false, control: null })}
        />
      </Modal>

      <ConfirmDialog
        open={aAlternar !== null}
        title={aAlternar?.active ? "Desactivar control" : "Activar control"}
        message={`¿Seguro que quieres ${aAlternar?.active ? "desactivar" : "activar"} el control ${aAlternar?.code ?? ""}?`}
        confirmLabel={aAlternar?.active ? "Desactivar" : "Activar"}
        onConfirm={() => void alternar()}
        onCancel={() => setAAlternar(null)}
      />

      {aviso ? <Toast message={aviso.mensaje} tone={aviso.tone} onClose={() => setAviso(null)} /> : null}
    </div>
  );
}

/** Formulario de alta y edición del catálogo de controles. */

"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { CheckboxField, SelectField, TextAreaField } from "@/components/ui/FormControls";
import { THEME_LABELS } from "@/shared/constants";
import type { ControlDTO, Theme } from "@/shared/types";
import { erroresServidor, mensajeError, TEMAS } from "@/lib/ui";
import { controlEsquema, validarCon } from "@/lib/validation";

export interface ControlFormData {
  code: string;
  name: string;
  description: string;
  criterion: string;
  source: string;
  theme: Theme;
  active: boolean;
}

type Errores = Record<string, string>;

const CAMPOS = ["code", "name", "description", "criterion", "source", "theme", "active"];

export interface ControlFormProps {
  initial?: ControlDTO | null;
  onSubmit: (datos: ControlFormData) => Promise<void>;
  onCancel: () => void;
}

export function ControlForm({ initial, onSubmit, onCancel }: ControlFormProps) {
  const [code, setCode] = useState(initial?.code ?? "");
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [criterion, setCriterion] = useState(initial?.criterion ?? "");
  const [source, setSource] = useState(initial?.source ?? "");
  const [theme, setTheme] = useState<Theme>(initial?.theme ?? "Organizacional");
  const [active, setActive] = useState(initial?.active ?? true);
  const [errores, setErrores] = useState<Errores>({});
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const enviar = async (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    setErrorGeneral(null);

    const { valores, errores: erroresLocales } = validarCon(controlEsquema, {
      code,
      name,
      description,
      criterion,
      source,
      theme,
      active,
    });
    setErrores(erroresLocales);
    if (!valores) {
      const primero = Object.keys(erroresLocales)[0];
      if (primero) document.getElementById(`control-${primero}`)?.focus();
      return;
    }

    setEnviando(true);
    try {
      await onSubmit(valores);
    } catch (error) {
      setErrores(erroresServidor(error, CAMPOS));
      setErrorGeneral(mensajeError(error));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <form onSubmit={enviar} noValidate className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          id="control-code"
          label="Código"
          value={code}
          onChange={(evento) => setCode(evento.target.value)}
          error={errores.code}
          disabled={enviando}
          maxLength={30}
          placeholder="5.15"
        />
        <Field
          id="control-name"
          label="Nombre"
          value={name}
          onChange={(evento) => setName(evento.target.value)}
          error={errores.name}
          disabled={enviando}
          maxLength={150}
          placeholder="Gestión del acceso"
        />
      </div>
      <TextAreaField
        id="control-description"
        label="Descripción"
        value={description}
        onChange={setDescription}
        error={errores.description}
        disabled={enviando}
        rows={3}
        maxLength={2000}
      />
      <TextAreaField
        id="control-criterion"
        label="Criterio de evaluación"
        value={criterion}
        onChange={setCriterion}
        error={errores.criterion}
        disabled={enviando}
        rows={3}
        maxLength={2000}
        placeholder="Qué debe comprobarse para considerar el control implementado"
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          id="control-source"
          label="Fuente"
          value={source}
          onChange={(evento) => setSource(evento.target.value)}
          error={errores.source}
          disabled={enviando}
          maxLength={150}
          placeholder="ISO/IEC 27001:2022, Anexo A"
        />
        <SelectField
          id="control-theme"
          label="Tema"
          value={theme}
          onChange={(valor) => setTheme(valor as Theme)}
          error={errores.theme}
          disabled={enviando}
          options={TEMAS.map((tema) => ({ value: tema, label: THEME_LABELS[tema] }))}
        />
      </div>
      <CheckboxField
        id="control-active"
        label="Control activo"
        checked={active}
        onChange={setActive}
        disabled={enviando}
        error={errores.active}
        descripcion="Los controles inactivos no se incorporan a nuevas auditorías."
      />

      {errorGeneral ? (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {errorGeneral}
        </p>
      ) : null}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onCancel} disabled={enviando}>
          Cancelar
        </Button>
        <Button type="submit" loading={enviando}>
          {enviando ? "Guardando…" : initial ? "Guardar cambios" : "Crear control"}
        </Button>
      </div>
    </form>
  );
}

export default ControlForm;

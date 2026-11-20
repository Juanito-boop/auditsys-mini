/** Controles de formulario accesibles que complementan `Field` (input de texto). */

"use client";

import type { ReactNode } from "react";
import { cx } from "@/lib/ui";

export interface Opcion {
  value: string;
  label: string;
}

interface BaseProps {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  disabled?: boolean;
}

const CLASE_CONTROL =
  "block w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:bg-slate-50 disabled:text-slate-500";

function borde(error?: string): string {
  return error
    ? "border-red-400 focus:border-red-500 focus:ring-red-300"
    : "border-slate-300 focus:border-slate-500 focus:ring-slate-300";
}

function Mensaje({ id, error, hint }: Pick<BaseProps, "id" | "error" | "hint">) {
  if (error) {
    return (
      <p id={`${id}-error`} role="alert" className="text-sm text-red-700">
        {error}
      </p>
    );
  }
  if (hint) {
    return (
      <p id={`${id}-hint`} className="text-xs leading-relaxed text-slate-500">
        {hint}
      </p>
    );
  }
  return null;
}

function descritoPor(id: string, error?: string, hint?: string): string | undefined {
  const partes = [hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean);
  return partes.length ? partes.join(" ") : undefined;
}

export interface SelectFieldProps extends BaseProps {
  value: string;
  options: ReadonlyArray<Opcion>;
  onChange: (valor: string) => void;
}

export function SelectField({
  id,
  label,
  value,
  options,
  onChange,
  error,
  hint,
  disabled,
}: SelectFieldProps) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-slate-800">
        {label}
      </label>
      <select
        id={id}
        value={value}
        disabled={disabled}
        onChange={(evento) => onChange(evento.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={descritoPor(id, error, hint)}
        className={cx(CLASE_CONTROL, borde(error))}
      >
        {options.map((opcion) => (
          <option key={opcion.value} value={opcion.value}>
            {opcion.label}
          </option>
        ))}
      </select>
      <Mensaje id={id} error={error} hint={hint} />
    </div>
  );
}

export interface TextAreaFieldProps extends BaseProps {
  value: string;
  onChange: (valor: string) => void;
  rows?: number;
  maxLength?: number;
  placeholder?: string;
}

export function TextAreaField({
  id,
  label,
  value,
  onChange,
  rows = 3,
  maxLength,
  placeholder,
  error,
  hint,
  disabled,
}: TextAreaFieldProps) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-slate-800">
        {label}
      </label>
      <textarea
        id={id}
        value={value}
        rows={rows}
        maxLength={maxLength}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(evento) => onChange(evento.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={descritoPor(id, error, hint)}
        className={cx(CLASE_CONTROL, borde(error), "resize-y leading-relaxed")}
      />
      <Mensaje id={id} error={error} hint={hint} />
    </div>
  );
}

export interface CheckboxFieldProps {
  id: string;
  label: string;
  checked: boolean;
  onChange: (marcado: boolean) => void;
  descripcion?: ReactNode;
  error?: string;
  disabled?: boolean;
}

export function CheckboxField({
  id,
  label,
  checked,
  onChange,
  descripcion,
  error,
  disabled,
}: CheckboxFieldProps) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(evento) => onChange(evento.target.checked)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-400 accent-slate-900"
        />
        <span className="min-w-0">
          <span className="block text-sm font-medium text-slate-800">{label}</span>
          {descripcion ? (
            <span className="mt-0.5 block text-xs leading-relaxed text-slate-600">{descripcion}</span>
          ) : null}
        </span>
      </label>
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-sm text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}

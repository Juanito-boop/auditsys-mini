"use client";

import type { ComponentPropsWithRef, ReactNode } from "react";
import { cx } from "@/lib/ui";

type Variante = "primary" | "secondary" | "ghost" | "danger";
type Tamano = "sm" | "md";

export interface ButtonProps extends ComponentPropsWithRef<"button"> {
  variant?: Variante;
  size?: Tamano;
  loading?: boolean;
  children: ReactNode;
}

const VARIANTES: Record<Variante, string> = {
  primary: "border border-slate-900 bg-slate-900 text-white hover:bg-slate-800",
  secondary: "border border-slate-300 bg-white text-slate-800 hover:bg-slate-50",
  ghost: "border border-transparent bg-transparent text-slate-700 hover:bg-slate-100",
  danger: "border border-red-700 bg-red-700 text-white hover:bg-red-800",
};

const TAMANOS: Record<Tamano, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-11 px-4 text-sm sm:text-base",
};

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  disabled,
  className,
  children,
  type = "button",
  ref,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60",
        VARIANTES[variant],
        TAMANOS[size],
        className,
      )}
    >
      {loading ? (
        <span
          aria-hidden="true"
          className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
      ) : null}
      {children}
    </button>
  );
}

export default Button;

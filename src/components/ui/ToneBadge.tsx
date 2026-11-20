/** Badges de estado con la paleta acordada para cada dimensión del modelo. */

"use client";

import type { ReactNode } from "react";
import { cx } from "@/lib/ui";
import { STATUS_COLORS } from "@/shared/constants";
import type { AuditStatus, ControlStatus, Priority, Severity } from "@/shared/types";

export type Tone = "success" | "warning" | "danger" | "orange" | "neutral" | "pending";

const TONOS: Record<Tone, string> = {
  success: STATUS_COLORS.implementado,
  warning: STATUS_COLORS.parcialmente_implementado,
  danger: STATUS_COLORS.no_implementado,
  orange: "bg-orange-100 text-orange-800 border border-orange-300",
  neutral: STATUS_COLORS.no_aplicable,
  pending: STATUS_COLORS.pendiente,
};

export function tonoAuditoria(status: AuditStatus): Tone {
  if (status === "cerrada") return "success";
  if (status === "en_curso") return "warning";
  return "pending";
}

export function tonoControl(status: ControlStatus): Tone {
  if (status === "implementado") return "success";
  if (status === "parcialmente_implementado") return "warning";
  if (status === "no_implementado") return "danger";
  if (status === "no_aplicable") return "neutral";
  return "pending";
}

export function tonoSeveridad(severity: Severity): Tone {
  if (severity === "baja") return "success";
  if (severity === "media") return "warning";
  if (severity === "alta") return "orange";
  return "danger";
}

export function tonoPrioridad(priority: Priority): Tone {
  if (priority === "baja") return "success";
  if (priority === "media") return "warning";
  return "danger";
}

export interface ToneBadgeProps {
  tone: Tone;
  children: ReactNode;
  className?: string;
}

export function ToneBadge({ tone, children, className }: ToneBadgeProps) {
  return (
    <span
      className={cx(
        "inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium",
        TONOS[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export default ToneBadge;

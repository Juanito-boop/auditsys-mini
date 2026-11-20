"use client";

import type { ReactNode } from "react";
import { CONTROL_STATUS_LABELS, STATUS_COLORS } from "@/shared/constants";
import type { ControlStatus } from "@/shared/types";
import { cx } from "@/lib/ui";

export interface BadgeProps {
  status: ControlStatus;
  children?: ReactNode;
  className?: string;
}

export function Badge({ status, children, className }: BadgeProps) {
  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        STATUS_COLORS[status],
        className,
      )}
    >
      {children ?? CONTROL_STATUS_LABELS[status]}
    </span>
  );
}

export default Badge;

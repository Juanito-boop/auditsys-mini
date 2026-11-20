"use client";

import type { HTMLAttributes, ReactNode } from "react";
import { cx } from "@/lib/ui";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function Card({ className, children, ...props }: CardProps) {
  return (
    <div {...props} className={cx("rounded-xl border border-slate-200 bg-white shadow-sm", className)}>
      {children}
    </div>
  );
}

export default Card;

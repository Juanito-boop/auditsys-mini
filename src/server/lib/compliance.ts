/**
 * Cálculo puro de indicadores de cumplimiento. Sin acceso a base de datos ni a Next.
 * Los controles pendientes nunca entran en el denominador.
 */

import { FORMULA, LIMITACIONES } from "@/shared/constants";
import type { IndicatorResult } from "@/shared/types";

export interface ConteoIndicadores {
  implementados: number;
  parcialmenteImplementados: number;
  noImplementados: number;
  noAplicables: number;
  pendientes: number;
}

function porcentaje(cantidad: number, denominador: number): number | null {
  if (denominador <= 0) return null;
  return Math.round((cantidad * 1000) / denominador) / 10;
}

export function calculateIndicators(c: ConteoIndicadores): IndicatorResult {
  const evaluados =
    c.implementados + c.parcialmenteImplementados + c.noImplementados + c.noAplicables;
  const denominador = evaluados - c.noAplicables;

  return {
    implementados: porcentaje(c.implementados, denominador),
    parcialmenteImplementados: porcentaje(c.parcialmenteImplementados, denominador),
    noImplementados: porcentaje(c.noImplementados, denominador),
    denominador,
    formula: FORMULA,
    limitaciones: [...LIMITACIONES],
  };
}

/** Formato visual con coma decimal, por ejemplo `55,6 %`. */
export function formatPercentage(valor: number | null): string {
  if (valor === null) return "N/A";
  return `${valor.toFixed(1).replace(".", ",")} %`;
}

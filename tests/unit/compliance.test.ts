import { describe, expect, it } from "vitest";
import { calculateIndicators, formatPercentage } from "@/server/lib/compliance";
import { FORMULA, LIMITACIONES } from "@/shared/constants";

describe("calculateIndicators", () => {
  it("todos implementados da 100 % y denominador 9", () => {
    expect(
      calculateIndicators({
        implementados: 9,
        parcialmenteImplementados: 0,
        noImplementados: 0,
        noAplicables: 0,
        pendientes: 0,
      }),
    ).toMatchObject({ implementados: 100, parcialmenteImplementados: 0, noImplementados: 0, denominador: 9 });
  });

  it("todos no aplicables deja los tres indicadores en null (denominador 0)", () => {
    expect(
      calculateIndicators({
        implementados: 0,
        parcialmenteImplementados: 0,
        noImplementados: 0,
        noAplicables: 4,
        pendientes: 0,
      }),
    ).toMatchObject({ implementados: null, parcialmenteImplementados: null, noImplementados: null, denominador: 0 });
  });

  it("5 implementados de 9 evaluados da 55,6 %", () => {
    expect(
      calculateIndicators({
        implementados: 5,
        parcialmenteImplementados: 2,
        noImplementados: 2,
        noAplicables: 0,
        pendientes: 0,
      }),
    ).toMatchObject({ implementados: 55.6, parcialmenteImplementados: 22.2, noImplementados: 22.2, denominador: 9 });
  });

  it("1 implementado de 3 evaluados da 33,3 %", () => {
    expect(
      calculateIndicators({
        implementados: 1,
        parcialmenteImplementados: 1,
        noImplementados: 1,
        noAplicables: 0,
        pendientes: 0,
      }),
    ).toMatchObject({ implementados: 33.3, parcialmenteImplementados: 33.3, noImplementados: 33.3, denominador: 3 });
  });

  it("los pendientes se excluyen del denominador", () => {
    expect(
      calculateIndicators({
        implementados: 1,
        parcialmenteImplementados: 0,
        noImplementados: 0,
        noAplicables: 0,
        pendientes: 5,
      }),
    ).toMatchObject({ implementados: 100, parcialmenteImplementados: 0, noImplementados: 0, denominador: 1 });
  });

  it("redondea a un decimal: 7 de 9 da 77,8 %", () => {
    expect(
      calculateIndicators({
        implementados: 7,
        parcialmenteImplementados: 1,
        noImplementados: 1,
        noAplicables: 0,
        pendientes: 0,
      }),
    ).toMatchObject({ implementados: 77.8, parcialmenteImplementados: 11.1, noImplementados: 11.1, denominador: 9 });
  });

  it("expone la fórmula y las limitaciones compartidas", () => {
    const resultado = calculateIndicators({
      implementados: 1,
      parcialmenteImplementados: 0,
      noImplementados: 0,
      noAplicables: 0,
      pendientes: 0,
    });
    expect(resultado.formula).toBe(FORMULA);
    expect(resultado.limitaciones).toEqual([...LIMITACIONES]);
  });
});

describe("formatPercentage", () => {
  it("devuelve N/A para null", () => {
    expect(formatPercentage(null)).toBe("N/A");
  });

  it("usa coma decimal y un espacio antes del símbolo", () => {
    expect(formatPercentage(55.6)).toBe("55,6 %");
    expect(formatPercentage(100)).toBe("100,0 %");
  });
});

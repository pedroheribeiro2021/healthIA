import { describe, expect, it } from "vitest";
import { perServing, scaleMacros, sumMacros } from "./macros";

const rice = { kcal: 128, proteinG: 2.5, carbsG: 28, fatG: 0.2 };

describe("scaleMacros", () => {
  it("escala linearmente pra uma quantidade em gramas", () => {
    expect(scaleMacros(rice, 200)).toEqual({
      kcal: 256,
      proteinG: 5,
      carbsG: 56,
      fatG: 0.4,
    });
  });

  it("retorna zero pra 0g", () => {
    expect(scaleMacros(rice, 0)).toEqual({ kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 });
  });
});

describe("sumMacros", () => {
  it("soma múltiplos ingredientes", () => {
    const a = { kcal: 100, proteinG: 10, carbsG: 5, fatG: 2 };
    const b = { kcal: 50, proteinG: 5, carbsG: 10, fatG: 1 };
    expect(sumMacros([a, b])).toEqual({ kcal: 150, proteinG: 15, carbsG: 15, fatG: 3 });
  });

  it("ignora entradas nulas (ingrediente sem macros conhecidos)", () => {
    const a = { kcal: 100, proteinG: 10, carbsG: 5, fatG: 2 };
    expect(sumMacros([a, null])).toEqual(a);
  });

  it("retorna zero pra lista vazia", () => {
    expect(sumMacros([])).toEqual({ kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 });
  });
});

describe("perServing", () => {
  it("divide o total pelo número de porções", () => {
    const total = { kcal: 400, proteinG: 40, carbsG: 20, fatG: 8 };
    expect(perServing(total, 4)).toEqual({ kcal: 100, proteinG: 10, carbsG: 5, fatG: 2 });
  });

  it("retorna o total sem dividir quando servings <= 0", () => {
    const total = { kcal: 400, proteinG: 40, carbsG: 20, fatG: 8 };
    expect(perServing(total, 0)).toEqual(total);
  });
});

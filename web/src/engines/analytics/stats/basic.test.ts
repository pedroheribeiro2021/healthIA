import { describe, expect, it } from "vitest";
import { linearRegression, mean, stddev, welchTStatistic } from "./basic";

describe("mean", () => {
  it("calcula a média", () => {
    expect(mean([1, 2, 3, 4])).toBe(2.5);
  });

  it("retorna null para lista vazia", () => {
    expect(mean([])).toBeNull();
  });
});

describe("stddev", () => {
  it("calcula o desvio padrão amostral", () => {
    expect(stddev([2, 4, 4, 4, 5, 5, 7, 9])).toBeCloseTo(2.138, 2);
  });

  it("retorna null com menos de 2 pontos", () => {
    expect(stddev([5])).toBeNull();
  });
});

describe("linearRegression", () => {
  it("recupera slope e intercept exatos de uma reta perfeita", () => {
    const points = [0, 1, 2, 3, 4].map((x) => ({ x, y: 2 * x + 1 }));
    const result = linearRegression(points);
    expect(result?.slope).toBeCloseTo(2, 6);
    expect(result?.intercept).toBeCloseTo(1, 6);
    expect(result?.r2).toBeCloseTo(1, 6);
  });

  it("r2 baixo para dados sem relação linear com x", () => {
    const points = [
      { x: 0, y: 5 },
      { x: 1, y: 1 },
      { x: 2, y: 8 },
      { x: 3, y: 2 },
    ];
    const result = linearRegression(points);
    expect(result?.r2).toBeLessThan(0.3);
  });

  it("retorna null com menos de 2 pontos", () => {
    expect(linearRegression([{ x: 0, y: 1 }])).toBeNull();
  });

  it("retorna null quando x é constante (reta vertical)", () => {
    expect(
      linearRegression([
        { x: 5, y: 1 },
        { x: 5, y: 2 },
      ]),
    ).toBeNull();
  });
});

describe("welchTStatistic", () => {
  it("t alto para amostras claramente diferentes", () => {
    const a = [10, 11, 10, 11, 10];
    const b = [20, 21, 20, 21, 20];
    expect(Math.abs(welchTStatistic(a, b) as number)).toBeGreaterThan(2);
  });

  it("t baixo para amostras equivalentes", () => {
    const a = [10, 12, 11, 9, 10];
    const b = [11, 10, 12, 9, 11];
    expect(Math.abs(welchTStatistic(a, b) as number)).toBeLessThan(2);
  });

  it("retorna null com menos de 2 pontos numa amostra", () => {
    expect(welchTStatistic([1], [1, 2, 3])).toBeNull();
  });
});

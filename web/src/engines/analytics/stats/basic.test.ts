import { describe, expect, it } from "vitest";
import {
  linearRegression,
  mean,
  pearsonCorrelation,
  rank,
  spearmanCorrelation,
  stddev,
  tCriticalValue005,
  welchTStatistic,
} from "./basic";

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

describe("rank", () => {
  it("atribui ranks 1..n para valores distintos", () => {
    expect(rank([30, 10, 20])).toEqual([3, 1, 2]);
  });

  it("usa rank médio para empates", () => {
    // 10 (rank 1), 20 e 20 (empatam ranks 2 e 3 -> 2.5), 30 (rank 4)
    expect(rank([20, 10, 20, 30])).toEqual([2.5, 1, 2.5, 4]);
  });
});

describe("pearsonCorrelation", () => {
  it("retorna 1 para relação linear perfeita crescente", () => {
    expect(pearsonCorrelation([1, 2, 3, 4], [2, 4, 6, 8])).toBeCloseTo(1, 6);
  });

  it("retorna -1 para relação linear perfeita decrescente", () => {
    expect(pearsonCorrelation([1, 2, 3, 4], [8, 6, 4, 2])).toBeCloseTo(-1, 6);
  });

  it("retorna null com variância zero", () => {
    expect(pearsonCorrelation([1, 1, 1], [1, 2, 3])).toBeNull();
  });

  it("retorna null com menos de 2 pontos", () => {
    expect(pearsonCorrelation([1], [1])).toBeNull();
  });
});

describe("tCriticalValue005", () => {
  it("bate com a tabela padrão em pontos conhecidos", () => {
    expect(tCriticalValue005(1)).toBeCloseTo(12.706, 3);
    expect(tCriticalValue005(10)).toBeCloseTo(2.228, 3);
    expect(tCriticalValue005(30)).toBeCloseTo(2.042, 3);
  });

  it("usa a aproximação normal para df grande", () => {
    expect(tCriticalValue005(1000)).toBeCloseTo(1.96, 2);
  });

  it("interpola entre pontos da tabela", () => {
    const value = tCriticalValue005(35);
    expect(value).toBeGreaterThan(2.021);
    expect(value).toBeLessThan(2.042);
  });
});

describe("spearmanCorrelation", () => {
  it("detecta correlação monotônica perfeita como significativa", () => {
    const xs = Array.from({ length: 14 }, (_, i) => i);
    const ys = xs.map((x) => x * x); // monotônica, não linear — Spearman pega, Pearson subestimaria
    const result = spearmanCorrelation(xs, ys);
    expect(result?.rho).toBeCloseTo(1, 6);
    expect(result?.significant).toBe(true);
  });

  it("não reporta significância para ruído sem relação", () => {
    const xs = [3, 1, 4, 1, 5, 9, 2, 6, 5, 3, 5, 8, 9, 7];
    const ys = [2, 7, 1, 8, 2, 8, 1, 8, 2, 8, 4, 5, 9, 0];
    const result = spearmanCorrelation(xs, ys);
    expect(result?.significant).toBe(false);
  });

  it("retorna null com menos de 3 pontos", () => {
    expect(spearmanCorrelation([1, 2], [1, 2])).toBeNull();
  });

  it("retorna null com tamanhos diferentes", () => {
    expect(spearmanCorrelation([1, 2, 3], [1, 2])).toBeNull();
  });
});

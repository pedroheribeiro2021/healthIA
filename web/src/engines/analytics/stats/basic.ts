export function mean(xs: number[]): number | null {
  if (xs.length === 0) return null;
  return xs.reduce((sum, x) => sum + x, 0) / xs.length;
}

// Desvio padrão amostral (n-1). Precisa de pelo menos 2 pontos.
export function stddev(xs: number[]): number | null {
  if (xs.length < 2) return null;
  const m = mean(xs) as number;
  const variance =
    xs.reduce((sum, x) => sum + (x - m) ** 2, 0) / (xs.length - 1);
  return Math.sqrt(variance);
}

export type LinearRegressionResult = {
  slope: number;
  intercept: number;
  r2: number;
};

// OLS simples sobre {x,y}. Retorna null com menos de 2 pontos ou x
// constante (reta vertical, sem slope definido).
export function linearRegression(
  points: { x: number; y: number }[],
): LinearRegressionResult | null {
  if (points.length < 2) return null;

  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const meanX = mean(xs) as number;
  const meanY = mean(ys) as number;

  const varX = xs.reduce((sum, x) => sum + (x - meanX) ** 2, 0);
  if (varX === 0) return null;

  const covXY = points.reduce(
    (sum, p) => sum + (p.x - meanX) * (p.y - meanY),
    0,
  );
  const slope = covXY / varX;
  const intercept = meanY - slope * meanX;

  const ssTot = ys.reduce((sum, y) => sum + (y - meanY) ** 2, 0);
  const ssRes = points.reduce(
    (sum, p) => sum + (p.y - (slope * p.x + intercept)) ** 2,
    0,
  );
  const r2 = ssTot === 0 ? 1 : 1 - ssRes / ssTot;

  return { slope, intercept, r2 };
}

// Estatística t de Welch (variâncias desiguais) entre duas amostras
// independentes — usada como aproximação de significância sem depender de
// biblioteca de estatística (docs/ENGINES.md: "sem dependência pesada").
// Não calcula p-valor/graus de liberdade exatos; comparisonEngine.ts aplica
// um limiar fixo (|t| > 2) documentado como heurística, não teste formal.
export function welchTStatistic(a: number[], b: number[]): number | null {
  if (a.length < 2 || b.length < 2) return null;

  const meanA = mean(a) as number;
  const meanB = mean(b) as number;
  const varA = (stddev(a) as number) ** 2;
  const varB = (stddev(b) as number) ** 2;

  const standardError = Math.sqrt(varA / a.length + varB / b.length);
  if (standardError === 0) return null;

  return (meanA - meanB) / standardError;
}

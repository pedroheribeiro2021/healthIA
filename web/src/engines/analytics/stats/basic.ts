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

// Rank médio (trata empates com a média das posições empatadas) — base do
// coeficiente de Spearman abaixo.
export function rank(xs: number[]): number[] {
  const indices = xs.map((_, i) => i).sort((a, b) => xs[a] - xs[b]);
  const ranks = new Array<number>(xs.length);

  let i = 0;
  while (i < indices.length) {
    let j = i;
    while (j + 1 < indices.length && xs[indices[j + 1]] === xs[indices[i]]) {
      j++;
    }
    // Posições i..j (0-based) empatadas ⇒ rank médio 1-based delas.
    const avgRank = (i + j) / 2 + 1;
    for (let k = i; k <= j; k++) ranks[indices[k]] = avgRank;
    i = j + 1;
  }

  return ranks;
}

// Correlação de Pearson entre duas amostras pareadas (mesmo índice = mesmo
// par). Retorna null com menos de 2 pontos ou variância zero em algum lado
// (correlação indefinida).
export function pearsonCorrelation(xs: number[], ys: number[]): number | null {
  if (xs.length !== ys.length || xs.length < 2) return null;

  const meanX = mean(xs) as number;
  const meanY = mean(ys) as number;
  const varX = xs.reduce((sum, x) => sum + (x - meanX) ** 2, 0);
  const varY = ys.reduce((sum, y) => sum + (y - meanY) ** 2, 0);
  if (varX === 0 || varY === 0) return null;

  const covXY = xs.reduce(
    (sum, x, i) => sum + (x - meanX) * (ys[i] - meanY),
    0,
  );
  return covXY / Math.sqrt(varX * varY);
}

// Valor crítico de t bicaudal para alfa = 0.05, por grau de liberdade —
// tabela padrão de livro-texto (não uma lib de estatística: docs/ENGINES.md
// "sem dependência pesada"). Para df fora da tabela, interpola linearmente
// entre os pontos vizinhos; acima de 120 usa a aproximação normal (1.96).
const T_CRITICAL_005: readonly [df: number, critical: number][] = [
  [1, 12.706], [2, 4.303], [3, 3.182], [4, 2.776], [5, 2.571],
  [6, 2.447], [7, 2.365], [8, 2.306], [9, 2.262], [10, 2.228],
  [11, 2.201], [12, 2.179], [13, 2.16], [14, 2.145], [15, 2.131],
  [16, 2.12], [17, 2.11], [18, 2.101], [19, 2.093], [20, 2.086],
  [21, 2.08], [22, 2.074], [23, 2.069], [24, 2.064], [25, 2.06],
  [26, 2.056], [27, 2.052], [28, 2.048], [29, 2.045], [30, 2.042],
  [40, 2.021], [60, 2.0], [120, 1.98],
];
const T_CRITICAL_LARGE_DF = 1.96;

export function tCriticalValue005(df: number): number {
  if (df < 1) return Infinity;
  if (df >= 120) return T_CRITICAL_LARGE_DF;

  for (let i = 0; i < T_CRITICAL_005.length - 1; i++) {
    const [dfLow, critLow] = T_CRITICAL_005[i];
    const [dfHigh, critHigh] = T_CRITICAL_005[i + 1];
    if (df >= dfLow && df <= dfHigh) {
      const t = (df - dfLow) / (dfHigh - dfLow);
      return critLow + t * (critHigh - critLow);
    }
  }
  return T_CRITICAL_LARGE_DF;
}

export type SpearmanResult = { rho: number; n: number; significant: boolean };

// Spearman = Pearson sobre os ranks. Significância via t de Student
// (t = rho·√((n-2)/(1-rho²)), df = n-2) contra o valor crítico bicaudal de
// alfa=0.05 acima — aproximação padrão de livro-texto para o teste de
// significância do coeficiente de Spearman, não um p-valor exato.
export function spearmanCorrelation(
  xs: number[],
  ys: number[],
): SpearmanResult | null {
  if (xs.length !== ys.length || xs.length < 3) return null;

  const rho = pearsonCorrelation(rank(xs), rank(ys));
  if (rho === null) return null;

  const n = xs.length;
  const df = n - 2;
  if (Math.abs(rho) >= 1) return { rho, n, significant: true };

  const t = rho * Math.sqrt(df / (1 - rho * rho));
  const significant = Math.abs(t) > tCriticalValue005(df);

  return { rho, n, significant };
}

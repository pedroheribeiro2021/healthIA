import type { TimeSeries, TrendResult } from "@/domain/analytics";
import { linearRegression } from "./stats/basic";

// Regressão linear simples (OLS), não Theil-Sen: com o volume de dados
// atual (dezenas de pontos, sem outliers conhecidos) a robustez extra do
// Theil-Sen não compensa a complexidade O(n²) — trade-off consciente,
// revisitar se sensores começarem a gerar outliers.
const FLAT_THRESHOLD_RELATIVE = 0.03;

export function analyzeTrend(series: TimeSeries): TrendResult {
  const points = series
    .map((point, index) => ({ x: index, y: point.value }))
    .filter((p): p is { x: number; y: number } => p.y !== null);

  if (points.length < 3) {
    return { direction: "flat", slope: 0, confidence: 0, insufficientData: true };
  }

  const regression = linearRegression(points);
  if (!regression) {
    return { direction: "flat", slope: 0, confidence: 0, insufficientData: true };
  }

  const avgY = points.reduce((sum, p) => sum + p.y, 0) / points.length;
  const totalChange = regression.slope * (points.length - 1);
  const relativeChange = avgY !== 0 ? Math.abs(totalChange / avgY) : 0;

  const direction =
    relativeChange < FLAT_THRESHOLD_RELATIVE
      ? "flat"
      : regression.slope > 0
        ? "up"
        : "down";

  return {
    direction,
    slope: regression.slope,
    confidence: Math.max(0, Math.min(1, regression.r2)),
    insufficientData: false,
  };
}

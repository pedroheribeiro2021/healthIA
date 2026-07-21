import type { ComparisonResult, Period, TimeSeries } from "@/domain/analytics";
import { mean, welchTStatistic } from "./stats/basic";

// Comparativo semana × semana (docs/ROADMAP.md Fase 3). "significant" é
// uma heurística (|t de Welch| > 2), não um teste formal com p-valor —
// suficiente pro dashboard sinalizar "isso mudou de verdade" sem carregar
// uma lib de estatística completa (docs/ENGINES.md).
const SIGNIFICANCE_THRESHOLD = 2;

export function compare(
  metricId: string,
  periodA: Period,
  seriesA: TimeSeries,
  periodB: Period,
  seriesB: TimeSeries,
): ComparisonResult {
  const valuesA = seriesA
    .map((p) => p.value)
    .filter((v): v is number => v !== null);
  const valuesB = seriesB
    .map((p) => p.value)
    .filter((v): v is number => v !== null);

  const meanA = mean(valuesA);
  const meanB = mean(valuesB);

  if (valuesA.length === 0 || valuesB.length === 0) {
    return {
      metricId,
      periodA,
      periodB,
      meanA,
      meanB,
      deltaAbs: null,
      deltaPct: null,
      significant: false,
      insufficientData: true,
    };
  }

  const deltaAbs = (meanA as number) - (meanB as number);
  const deltaPct = meanB !== 0 && meanB !== null ? (deltaAbs / meanB) * 100 : null;
  const t = welchTStatistic(valuesA, valuesB);
  const significant = t !== null && Math.abs(t) > SIGNIFICANCE_THRESHOLD;

  return {
    metricId,
    periodA,
    periodB,
    meanA,
    meanB,
    deltaAbs,
    deltaPct,
    significant,
    insufficientData: false,
  };
}

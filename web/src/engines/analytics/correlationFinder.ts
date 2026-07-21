import type { CorrelationResult, LocalDay, TimeSeries } from "@/domain/analytics";
import { addDays } from "./period";
import { spearmanCorrelation } from "./stats/basic";

const MIN_PAIRS = 14;

// Alinha duas séries diárias com defasagem: para cada dia presente em
// `lagSeries`, busca o valor de `leadSeries` `lagDays` dias antes. Só pares
// com os dois lados não-nulos entram na amostra (docs/ENGINES.md: "sono
// ontem × HRV hoje" = leadSeries defasada em 1 dia antecedendo lagSeries).
function alignWithLag(
  leadSeries: TimeSeries,
  lagSeries: TimeSeries,
  lagDays: number,
): { x: number; y: number }[] {
  const leadByDay = new Map<LocalDay, number | null>(
    leadSeries.map((p) => [p.day, p.value]),
  );

  const pairs: { x: number; y: number }[] = [];
  for (const point of lagSeries) {
    if (point.value === null) continue;
    const leadValue = leadByDay.get(addDays(point.day, -lagDays));
    if (leadValue === undefined || leadValue === null) continue;
    pairs.push({ x: leadValue, y: point.value });
  }
  return pairs;
}

// CorrelationFinder (docs/ENGINES.md): testa cada par ordenado de métricas
// com defasagem 0..maxLagDays dias (metricA antecede metricB). Spearman;
// só retorna pares com n >= 14 e teste de significância aprovado (p < 0.05
// aproximado — ver stats/basic.ts). Em lag 0 a correlação é simétrica, então
// cada par desordenado só é testado uma vez nesse caso.
export function findCorrelations(
  metrics: Record<string, TimeSeries>,
  maxLagDays = 3,
): CorrelationResult[] {
  const metricIds = Object.keys(metrics);
  const results: CorrelationResult[] = [];

  for (let i = 0; i < metricIds.length; i++) {
    for (let j = 0; j < metricIds.length; j++) {
      if (i === j) continue;

      for (let lagDays = 0; lagDays <= maxLagDays; lagDays++) {
        if (lagDays === 0 && i > j) continue;

        const metricA = metricIds[i];
        const metricB = metricIds[j];
        const pairs = alignWithLag(metrics[metricA], metrics[metricB], lagDays);
        if (pairs.length < MIN_PAIRS) continue;

        const spearman = spearmanCorrelation(
          pairs.map((p) => p.x),
          pairs.map((p) => p.y),
        );
        if (!spearman || !spearman.significant) continue;

        results.push({
          metricA,
          metricB,
          lagDays,
          rho: spearman.rho,
          n: spearman.n,
        });
      }
    }
  }

  return results;
}

import type { LocalDay, TimeSeries, TrendResult } from "@/domain/analytics";
import type { MetricRepository } from "@/domain/repositories";
import { daysBetween, localDayBounds } from "./period";
import { seriesFromDailySnapshots } from "./rollup";
import { analyzeTrend } from "./trendAnalyzer";

// Leitura pronta pra UI/API: série diária de um metric_id + tendência já
// calculada. Usado por GET /api/v1/metrics/{metricId} e pelas páginas do
// dashboard.
export async function getMetricSeries(
  metricRepo: MetricRepository,
  metricId: string,
  from: LocalDay,
  to: LocalDay,
): Promise<{ series: TimeSeries; trend: TrendResult }> {
  const days = daysBetween(from, to);
  const snapshots = await metricRepo.listMetricSnapshots({
    metricId,
    from: localDayBounds(from).start,
    to: localDayBounds(to).end,
  });
  const series = seriesFromDailySnapshots(snapshots, days);
  return { series, trend: analyzeTrend(series) };
}

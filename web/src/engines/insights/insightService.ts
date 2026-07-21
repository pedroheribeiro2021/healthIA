import type {
  CorrelationResult,
  LocalDay,
  MetricSnapshot,
  TimeSeries,
} from "@/domain/analytics";
import type { HealthEvent } from "@/domain/healthEvent";
import type { Insight } from "@/domain/insights";
import type {
  EventRepository,
  GoalRepository,
  InsightRepository,
  MetricRepository,
} from "@/domain/repositories";
import { findCorrelations } from "../analytics/correlationFinder";
import { addDays, lastNDays, localDayBounds, todayLocalDay } from "../analytics/period";
import { seriesFromDailySnapshots } from "../analytics/rollup";
import { evaluateInsightRules } from "./ruleEngine";
import type { MetricStore } from "./types";

// Métricas "cruas" diárias testadas par a par pelo CorrelationFinder — não
// inclui rollups (avg7d/avg30d/baseline60d), que são derivadas dessas e
// correlacioná-las entre si só re-descobriria a mesma relação com atraso.
// Exportadas pra GET /api/v1/correlations reusar a mesma janela/conjunto de
// métricas do insightService, em vez de duplicar a lista.
export const CORRELATION_METRIC_IDS = [
  "sleep.duration.daily",
  "sleep.efficiency.daily",
  "hr.resting.daily",
  "hrv.rmssd.daily",
  "training.load.daily",
  "body.weight.daily",
  "recovery.score.daily",
] as const;
export const CORRELATION_WINDOW_DAYS = 60;

// Snapshots de rollup que alguma regra de insight lê como "valor mais
// recente" (não como série) — buscados só pelo período do próprio `day`,
// igual a analyticsService.ts.
const LATEST_ROLLUP_METRIC_IDS = [
  "hrv.rmssd.daily",
  "hrv.rmssd.baseline60d",
  "sleep.duration.avg7d",
  "sleep.duration.avg30d",
  "training.load.acwr",
] as const;

const RECENT_WORKOUTS_WINDOW_DAYS = 14;
// Sem import de exames ainda (Fase 5) — janela generosa já deixa pronto
// pra quando existir, sem crescer sem limite indefinidamente.
const RECENT_LAB_RESULTS_WINDOW_DAYS = 400;

async function buildMetricStore(
  eventRepo: EventRepository,
  metricRepo: MetricRepository,
  goalRepo: GoalRepository,
  day: LocalDay,
): Promise<MetricStore> {
  const period = localDayBounds(day);
  const correlationDays = lastNDays(day, CORRELATION_WINDOW_DAYS);
  const correlationWindowStart = localDayBounds(correlationDays[0]).start;

  const [
    todaySummary,
    recentDailySummaries,
    correlationSnapshotsByMetric,
    weightAvg7dSnapshots,
    latestRollupSnapshots,
    recentWorkouts,
    recentLabResults,
    activeGoals,
  ] = await Promise.all([
    metricRepo.getDailySummary(day),
    metricRepo.listDailySummaries({ from: addDays(day, -29), to: day }),
    Promise.all(
      CORRELATION_METRIC_IDS.map((metricId) =>
        metricRepo
          .listMetricSnapshots({
            metricId,
            from: correlationWindowStart,
            to: period.end,
          })
          .then((snapshots) => [metricId, snapshots] as const),
      ),
    ),
    metricRepo.listMetricSnapshots({
      metricId: "body.weight.avg7d",
      from: correlationWindowStart,
      to: period.end,
    }),
    Promise.all(
      LATEST_ROLLUP_METRIC_IDS.map((metricId) =>
        metricRepo
          .listMetricSnapshots({ metricId, from: period.start, to: period.end })
          .then((snapshots) => [metricId, snapshots[0] ?? null] as const),
      ),
    ),
    eventRepo.listHealthEvents({
      eventType: "workout",
      from: localDayBounds(addDays(day, -RECENT_WORKOUTS_WINDOW_DAYS)).start,
      to: period.end,
    }),
    eventRepo.listHealthEvents({
      eventType: "lab_result",
      from: localDayBounds(addDays(day, -RECENT_LAB_RESULTS_WINDOW_DAYS)).start,
      to: period.end,
    }),
    goalRepo.listActiveGoals(),
  ]);

  const metricSeries: Record<string, TimeSeries> = {
    "body.weight.avg7d": seriesFromDailySnapshots(weightAvg7dSnapshots, correlationDays),
  };
  for (const [metricId, snapshots] of correlationSnapshotsByMetric) {
    metricSeries[metricId] = seriesFromDailySnapshots(snapshots, correlationDays);
  }

  const latestMetrics: Record<string, MetricSnapshot | null> =
    Object.fromEntries(latestRollupSnapshots);

  // CorrelationFinder só recebe as métricas "cruas" (não os rollups
  // derivados delas) — ver comentário de CORRELATION_METRIC_IDS.
  const correlationSeries: Record<string, TimeSeries> = Object.fromEntries(
    CORRELATION_METRIC_IDS.map((id) => [id, metricSeries[id]]),
  );
  const correlations = findCorrelations(correlationSeries, 3);

  const recentLabResultsByMarker = new Map<string, HealthEvent>();
  for (const event of recentLabResults) {
    const marker = (event.detail as { marker?: unknown } | null)?.marker;
    if (typeof marker !== "string") continue;
    const existing = recentLabResultsByMarker.get(marker);
    if (!existing || Date.parse(event.startTime) > Date.parse(existing.startTime)) {
      recentLabResultsByMarker.set(marker, event);
    }
  }

  return {
    day,
    todaySummary,
    recentDailySummaries,
    latestMetrics,
    metricSeries,
    correlations,
    recentWorkouts,
    recentLabResults: Array.from(recentLabResultsByMarker.values()),
    activeGoals,
  };
}

// Recalcula os insights de um dia: monta o MetricStore (I/O), roda as 7
// regras (puras) e persiste só as que ainda não tinham disparado pro mesmo
// rule_id + período — a tabela `insights` não tem unique constraint (é um
// log de ocorrências, não uma camada upsert como metric_snapshots), então
// recomputes repetidos do mesmo dia precisam desse dedup na aplicação pra
// não duplicar entrada a cada vez que o cron ou o admin/recompute rodar.
export async function recomputeInsights(
  eventRepo: EventRepository,
  metricRepo: MetricRepository,
  goalRepo: GoalRepository,
  insightRepo: InsightRepository,
  day: LocalDay,
): Promise<Insight[]> {
  const store = await buildMetricStore(eventRepo, metricRepo, goalRepo, day);
  const triggered = evaluateInsightRules(store);

  const persisted: Insight[] = [];
  for (const candidate of triggered) {
    const existing =
      candidate.periodStart && candidate.periodEnd
        ? await insightRepo.findActiveByRuleAndPeriod({
            ruleId: candidate.ruleId,
            periodStart: candidate.periodStart,
            periodEnd: candidate.periodEnd,
          })
        : null;
    persisted.push(existing ?? (await insightRepo.insertInsight(candidate)));
  }
  return persisted;
}

// Correlações descobertas nos últimos CORRELATION_WINDOW_DAYS dias a partir
// de hoje — usado tanto por GET /api/v1/correlations quanto pela tela
// "/insights" do dashboard, pra não duplicar a montagem das séries.
export async function listCorrelations(
  metricRepo: MetricRepository,
  { minConfidence = 0 }: { minConfidence?: number } = {},
): Promise<CorrelationResult[]> {
  const today = todayLocalDay();
  const days = lastNDays(today, CORRELATION_WINDOW_DAYS);
  const windowStart = localDayBounds(days[0]).start;
  const windowEnd = localDayBounds(days[days.length - 1]).end;

  const series: Record<string, TimeSeries> = Object.fromEntries(
    await Promise.all(
      CORRELATION_METRIC_IDS.map(async (metricId) => {
        const snapshots = await metricRepo.listMetricSnapshots({
          metricId,
          from: windowStart,
          to: windowEnd,
        });
        return [metricId, seriesFromDailySnapshots(snapshots, days)] as const;
      }),
    ),
  );

  return findCorrelations(series, 3).filter(
    (c) => Math.abs(c.rho) >= minConfidence,
  );
}

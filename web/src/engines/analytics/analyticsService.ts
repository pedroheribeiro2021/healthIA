import type {
  DailySummary,
  LocalDay,
  MetricSnapshot,
  NewDailySummary,
  NewMetricSnapshot,
} from "@/domain/analytics";
import type { EventRepository, MetricRepository } from "@/domain/repositories";
import { computeAcwr } from "./calculators/acwr";
import {
  computeBodyFatPctDaily,
  computeLeanMassDaily,
} from "./calculators/bodyComposition";
import { computeHrvRmssdDaily } from "./calculators/hrv";
import { computeRecoveryScoreDaily } from "./calculators/recoveryScore";
import { computeRestingHrDaily } from "./calculators/restingHr";
import {
  computeSleepBedtimeAvg7d,
  computeSleepDurationDaily,
  computeSleepEfficiencyDaily,
} from "./calculators/sleep";
import { computeTrainingLoadDaily } from "./calculators/trainingLoad";
import { computeWeightDaily } from "./calculators/weight";
import { addDays, isWithinPeriod, lastNDays, localDayBounds } from "./period";
import { averageOverWindow, seriesFromDailySnapshots } from "./rollup";

async function listDailySnapshots(
  metricRepo: MetricRepository,
  metricId: string,
  days: LocalDay[],
): Promise<MetricSnapshot[]> {
  return metricRepo.listMetricSnapshots({
    metricId,
    from: localDayBounds(days[0]).start,
    to: localDayBounds(days[days.length - 1]).end,
  });
}

// Recalcula todos os metric_snapshots e a linha de daily_summary de um dia
// local. Idempotente (upsert pela unique constraint de cada tabela) —
// pode ser chamado quantas vezes for preciso a partir de health_events,
// coerente com "camada derivada recalculável" (docs/DATA_MODEL.md).
export async function recomputeDay(
  eventRepo: EventRepository,
  metricRepo: MetricRepository,
  day: LocalDay,
): Promise<DailySummary> {
  const period = localDayBounds(day);
  const days7 = lastNDays(day, 7);
  const days28 = lastNDays(day, 28);
  const days30 = lastNDays(day, 30);
  const days60 = lastNDays(day, 60);

  const sleepWindowStart = localDayBounds(days7[0]).start;
  const heartRateWindowStart = localDayBounds(addDays(day, -1)).start;
  const windowEnd = localDayBounds(addDays(day, 1)).end;

  const [
    sleepEvents,
    heartRateEvents,
    workoutEvents,
    weightEvents,
    hrvEvents,
    stepsEvents,
    bodyCompositionEvents,
  ] = await Promise.all([
    eventRepo.listHealthEvents({
      eventType: "sleep_session",
      from: sleepWindowStart,
      to: windowEnd,
    }),
    eventRepo.listHealthEvents({
      eventType: "heart_rate",
      from: heartRateWindowStart,
      to: windowEnd,
    }),
    eventRepo.listHealthEvents({
      eventType: "workout",
      from: heartRateWindowStart,
      to: windowEnd,
    }),
    eventRepo.listHealthEvents({
      eventType: "weight",
      from: period.start,
      to: period.end,
    }),
    eventRepo.listHealthEvents({
      eventType: "hrv",
      from: period.start,
      to: period.end,
    }),
    eventRepo.listHealthEvents({
      eventType: "steps",
      from: period.start,
      to: period.end,
    }),
    eventRepo.listHealthEvents({
      eventType: "body_composition",
      from: period.start,
      to: period.end,
    }),
  ]);

  // 1) Calculators do dia — só dependem de health_events já buscados.
  const weightResult = computeWeightDaily(weightEvents, period);
  const sleepDurationResult = computeSleepDurationDaily(sleepEvents, period);
  const sleepEfficiencyResult = computeSleepEfficiencyDaily(sleepEvents, period);
  const restingHrResult = computeRestingHrDaily(
    [...sleepEvents, ...heartRateEvents],
    period,
  );
  const hrvResult = computeHrvRmssdDaily(hrvEvents, period);
  const trainingLoadResult = computeTrainingLoadDaily(
    [...workoutEvents, ...heartRateEvents],
    period,
    restingHrResult.value,
  );
  const bedtimeResult = computeSleepBedtimeAvg7d(sleepEvents, {
    start: sleepWindowStart,
    end: period.end,
  });
  const bodyFatPctResult = computeBodyFatPctDaily(bodyCompositionEvents, period);
  const leanMassResult = computeLeanMassDaily(bodyCompositionEvents, period);

  await metricRepo.upsertMetricSnapshots([
    weightResult,
    sleepDurationResult,
    sleepEfficiencyResult,
    restingHrResult,
    hrvResult,
    trainingLoadResult,
    bedtimeResult,
    bodyFatPctResult,
    leanMassResult,
  ]);

  // 2) Rollups — precisam do histórico diário já persistido, incluindo o
  // snapshot de `day` que acabamos de salvar acima.
  const [
    weightSnaps7,
    sleepDurSnaps7,
    sleepDurSnaps30,
    restingHrSnaps7,
    restingHrSnaps60,
    hrvSnaps7,
    hrvSnaps60,
    loadSnaps28,
  ] = await Promise.all([
    listDailySnapshots(metricRepo, "body.weight.daily", days7),
    listDailySnapshots(metricRepo, "sleep.duration.daily", days7),
    listDailySnapshots(metricRepo, "sleep.duration.daily", days30),
    listDailySnapshots(metricRepo, "hr.resting.daily", days7),
    listDailySnapshots(metricRepo, "hr.resting.daily", days60),
    listDailySnapshots(metricRepo, "hrv.rmssd.daily", days7),
    listDailySnapshots(metricRepo, "hrv.rmssd.daily", days60),
    listDailySnapshots(metricRepo, "training.load.daily", days28),
  ]);

  const weightAvg7d = averageOverWindow(seriesFromDailySnapshots(weightSnaps7, days7));
  const sleepAvg7d = averageOverWindow(seriesFromDailySnapshots(sleepDurSnaps7, days7));
  const sleepAvg30d = averageOverWindow(seriesFromDailySnapshots(sleepDurSnaps30, days30));
  const restingHrAvg7d = averageOverWindow(
    seriesFromDailySnapshots(restingHrSnaps7, days7),
  );
  const restingHrBaseline60d = averageOverWindow(
    seriesFromDailySnapshots(restingHrSnaps60, days60),
  );
  const hrvAvg7d = averageOverWindow(seriesFromDailySnapshots(hrvSnaps7, days7));
  const hrvBaseline60d = averageOverWindow(
    seriesFromDailySnapshots(hrvSnaps60, days60),
  );
  const loadSeries28 = seriesFromDailySnapshots(loadSnaps28, days28);
  const acwrResult = computeAcwr(loadSeries28, period);

  const rollupSnapshots: NewMetricSnapshot[] = [
    rollupResult("body.weight.avg7d", period, weightAvg7d),
    rollupResult("sleep.duration.avg7d", period, sleepAvg7d),
    rollupResult("sleep.duration.avg30d", period, sleepAvg30d),
    rollupResult("hr.resting.avg7d", period, restingHrAvg7d),
    rollupResult("hr.resting.baseline60d", period, restingHrBaseline60d),
    rollupResult("hrv.rmssd.avg7d", period, hrvAvg7d),
    rollupResult("hrv.rmssd.baseline60d", period, hrvBaseline60d),
    acwrResult,
  ];
  await metricRepo.upsertMetricSnapshots(rollupSnapshots);

  // 3) Recovery Score — composto sobre os resultados acima.
  const recoveryResult = computeRecoveryScoreDaily(
    {
      hrvToday: hrvResult.value,
      hrvBaseline60d: hrvBaseline60d.value,
      sleepDurationS: sleepDurationResult.value,
      sleepEfficiency: sleepEfficiencyResult.value,
      rhrToday: restingHrResult.value,
      rhrBaseline60d: restingHrBaseline60d.value,
      acwr: acwrResult.value,
    },
    period,
  );
  await metricRepo.upsertMetricSnapshots([recoveryResult]);

  // 4) daily_summary — agregação de apresentação, não recalculável a
  // partir de outros metric_snapshots além do que já computamos aqui.
  const stepsTotal = stepsEvents.reduce((sum, e) => sum + (e.value ?? 0), 0);
  const workoutsToday = workoutEvents.filter((e) =>
    isWithinPeriod(e.startTime, period),
  ).length;

  const summary: NewDailySummary = {
    day,
    sleepDurationS: sleepDurationResult.value,
    // v1: sem fórmula própria de "sleep score" documentada — reusa
    // eficiência do sono. Pode ganhar cálculo dedicado depois.
    sleepScore: sleepEfficiencyResult.value,
    restingHr: restingHrResult.value,
    hrvRmssd: hrvResult.value,
    steps: stepsEvents.length > 0 ? Math.round(stepsTotal) : null,
    workouts: workoutsToday,
    trainingLoad: trainingLoadResult.value,
    kcalIn: null,
    proteinG: null,
    waterL: null,
    weightKg: weightResult.value,
    recoveryScore: recoveryResult.value,
  };

  return metricRepo.upsertDailySummary(summary);
}

export async function recomputeRange(
  eventRepo: EventRepository,
  metricRepo: MetricRepository,
  from: LocalDay,
  to: LocalDay,
): Promise<{ daysProcessed: number }> {
  let day = from;
  let daysProcessed = 0;
  while (day <= to) {
    await recomputeDay(eventRepo, metricRepo, day);
    daysProcessed++;
    day = addDays(day, 1);
  }
  return { daysProcessed };
}

function rollupResult(
  metricId: string,
  period: { start: string; end: string },
  rollup: { value: number | null; n: number },
): NewMetricSnapshot {
  return {
    metricId,
    periodStart: period.start,
    periodEnd: period.end,
    value: rollup.value,
    detail: { n: rollup.n },
    algoVersion: "v1",
  };
}

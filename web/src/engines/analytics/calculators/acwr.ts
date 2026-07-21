import type { MetricResult, Period, TimeSeries } from "@/domain/analytics";

const ALGO_VERSION = "v1";
const ACUTE_WINDOW_DAYS = 7;
const CHRONIC_WINDOW_DAYS = 28;

// dailyLoadSeries: últimos 28 dias de training.load.daily, ordem
// ascendente, um ponto por dia (dia sem snapshot ainda computado é tratado
// como carga 0, mesma convenção de "ausência de treino = 0" do calculator
// de carga diária).
export function computeAcwr(
  dailyLoadSeries: TimeSeries,
  period: Period,
): MetricResult {
  const last7 = dailyLoadSeries.slice(-ACUTE_WINDOW_DAYS);
  const last28 = dailyLoadSeries.slice(-CHRONIC_WINDOW_DAYS);

  const acute = last7.reduce((sum, p) => sum + (p.value ?? 0), 0);
  const chronic =
    last28.reduce((sum, p) => sum + (p.value ?? 0), 0) /
    (CHRONIC_WINDOW_DAYS / 7);

  const coverageDays = last28.length;
  const value = chronic > 0 ? acute / chronic : null;

  return {
    metricId: "training.load.acwr",
    periodStart: period.start,
    periodEnd: period.end,
    value,
    detail: {
      acute,
      chronic,
      coverageDays,
      insufficientData: coverageDays < ACUTE_WINDOW_DAYS,
    },
    algoVersion: ALGO_VERSION,
  };
}

import { addDays, localDayBounds } from "@/engines/analytics/period";
import type { InsightRule } from "../types";

const SHORT_SLEEP_THRESHOLD_S = 6 * 3600;
// HRV hoje abaixo de 90% da baseline de 60 dias conta como "queda".
const HRV_DROP_RATIO = 0.9;

// docs/ENGINES.md: "correlação sono<6h -> queda HRV confirmada + ocorreu
// ontem". A correlação precisa ter sido confirmada estatisticamente pelo
// CorrelationFinder (não é assumida) — só então checamos se o padrão
// específico se repetiu ontem/hoje.
export const hrvDropAfterShortSleep: InsightRule = {
  ruleId: "hrv_drop_after_short_sleep",
  requiredMetrics: [
    "sleep.duration.daily",
    "hrv.rmssd.daily",
    "hrv.rmssd.baseline60d",
  ],
  evaluate(store) {
    const correlationConfirmed = store.correlations.some(
      (c) =>
        c.metricA === "sleep.duration.daily" &&
        c.metricB === "hrv.rmssd.daily" &&
        c.lagDays === 1 &&
        c.rho > 0,
    );
    if (!correlationConfirmed) return null;

    const yesterday = addDays(store.day, -1);
    const yesterdaySleep =
      store.metricSeries["sleep.duration.daily"]?.find(
        (p) => p.day === yesterday,
      )?.value ?? null;
    if (yesterdaySleep === null || yesterdaySleep >= SHORT_SLEEP_THRESHOLD_S) {
      return null;
    }

    const hrvToday = store.latestMetrics["hrv.rmssd.daily"]?.value ?? null;
    const hrvBaseline =
      store.latestMetrics["hrv.rmssd.baseline60d"]?.value ?? null;
    if (hrvToday === null || hrvBaseline === null || hrvBaseline === 0) {
      return null;
    }
    if (hrvToday >= hrvBaseline * HRV_DROP_RATIO) return null;

    const period = localDayBounds(store.day);
    return {
      ruleId: "hrv_drop_after_short_sleep",
      severity: "attention",
      title: "Sono curto ontem pode ter afetado sua recuperação hoje",
      body: `Você dormiu ${(yesterdaySleep / 3600).toFixed(1)}h ontem — abaixo de 6h — e seu HRV hoje (${hrvToday.toFixed(1)}ms) está abaixo da sua baseline de 60 dias (${hrvBaseline.toFixed(1)}ms). Essa relação já foi confirmada estatisticamente nos seus dados.`,
      evidence: {
        yesterdaySleepHours: yesterdaySleep / 3600,
        hrvToday,
        hrvBaseline60d: hrvBaseline,
      },
      periodStart: period.start,
      periodEnd: period.end,
    };
  },
};

import { localDayBounds } from "@/engines/analytics/period";
import type { InsightRule } from "../types";

const REGRESSION_THRESHOLD = 0.1;

export const sleepRegression: InsightRule = {
  ruleId: "sleep_regression",
  requiredMetrics: ["sleep.duration.avg7d", "sleep.duration.avg30d"],
  evaluate(store) {
    const avg7d = store.latestMetrics["sleep.duration.avg7d"]?.value ?? null;
    const avg30d = store.latestMetrics["sleep.duration.avg30d"]?.value ?? null;
    if (avg7d === null || avg30d === null || avg30d === 0) return null;

    const dropRatio = (avg30d - avg7d) / avg30d;
    if (dropRatio <= REGRESSION_THRESHOLD) return null;

    const period = localDayBounds(store.day);
    return {
      ruleId: "sleep_regression",
      severity: "attention",
      title: "Duração do sono caiu na última semana",
      body: `Sua média de sono nos últimos 7 dias (${(avg7d / 3600).toFixed(1)}h) caiu ${(dropRatio * 100).toFixed(0)}% em relação aos últimos 30 dias (${(avg30d / 3600).toFixed(1)}h).`,
      evidence: {
        avg7dHours: avg7d / 3600,
        avg30dHours: avg30d / 3600,
        dropPct: dropRatio * 100,
      },
      periodStart: period.start,
      periodEnd: period.end,
    };
  },
};

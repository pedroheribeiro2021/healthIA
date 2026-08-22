import { localDayBounds } from "@/engines/analytics/period";
import type { InsightRule } from "../types";

const ACWR_HIGH_THRESHOLD = 1.5;

export const acwrHigh: InsightRule = {
  ruleId: "acwr_high",
  requiredMetrics: ["training.load.acwr"],
  evaluate(store) {
    const acwr = store.latestMetrics["training.load.acwr"]?.value ?? null;
    if (acwr === null || acwr <= ACWR_HIGH_THRESHOLD) return null;

    const period = localDayBounds(store.day);
    return {
      ruleId: "acwr_high",
      severity: "alert",
      title: "Risco de overtraining (carga de treino subiu rápido demais)",
      body: `ACWR é a razão entre sua carga de treino recente (7 dias) e a carga usual (últimas 4 semanas) — mede se você acelerou rápido demais. Está em ${acwr.toFixed(2)}, acima do limite seguro de ${ACWR_HIGH_THRESHOLD}.`,
      evidence: { acwr, threshold: ACWR_HIGH_THRESHOLD },
      periodStart: period.start,
      periodEnd: period.end,
    };
  },
};

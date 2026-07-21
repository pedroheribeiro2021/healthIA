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
      title: "Risco de overtraining (ACWR alto)",
      body: `Seu ACWR está em ${acwr.toFixed(2)}, acima do limite de ${ACWR_HIGH_THRESHOLD} — carga aguda bem maior que a crônica.`,
      evidence: { acwr, threshold: ACWR_HIGH_THRESHOLD },
      periodStart: period.start,
      periodEnd: period.end,
    };
  },
};

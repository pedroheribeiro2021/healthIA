import { localDayBounds } from "@/engines/analytics/period";
import { analyzeTrend } from "@/engines/analytics/trendAnalyzer";
import type { InsightRule } from "../types";

// Abaixo disso a regressão não é confiável o bastante pra virar alerta —
// mesmo espírito do FLAT_THRESHOLD do trendAnalyzer, mas aplicado à
// confiança (r²) em vez de à magnitude da variação.
const MIN_TREND_CONFIDENCE = 0.3;

const DIRECTION_LABEL: Record<string, string> = {
  decrease: "reduzir",
  increase: "aumentar",
  maintain: "manter",
};

export const weightTrendVsGoal: InsightRule = {
  ruleId: "weight_trend_vs_goal",
  requiredMetrics: ["body.weight.avg7d"],
  evaluate(store) {
    const goal = store.activeGoals.find(
      (g) => g.metricId === "body.weight.avg7d",
    );
    if (!goal) return null;

    const series = store.metricSeries["body.weight.avg7d"];
    if (!series) return null;
    const trend = analyzeTrend(series);
    if (trend.insufficientData || trend.confidence < MIN_TREND_CONFIDENCE) {
      return null;
    }

    const diverges =
      (goal.direction === "decrease" && trend.direction === "up") ||
      (goal.direction === "increase" && trend.direction === "down") ||
      (goal.direction === "maintain" && trend.direction !== "flat");
    if (!diverges) return null;

    const period = localDayBounds(store.day);
    return {
      ruleId: "weight_trend_vs_goal",
      severity: "attention",
      title: "Tendência de peso diverge da sua meta",
      body: `Sua meta é ${DIRECTION_LABEL[goal.direction]} o peso, mas a tendência atual dos últimos dias é "${trend.direction}".`,
      evidence: {
        goalDirection: goal.direction,
        goalTarget: goal.targetValue,
        trendDirection: trend.direction,
        trendConfidence: trend.confidence,
      },
      periodStart: period.start,
      periodEnd: period.end,
    };
  },
};

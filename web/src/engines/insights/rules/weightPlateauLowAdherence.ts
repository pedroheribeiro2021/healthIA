import { localDayBounds } from "@/engines/analytics/period";
import { mean } from "@/engines/analytics/stats/basic";
import { analyzeTrend } from "@/engines/analytics/trendAnalyzer";
import type { InsightRule } from "../types";

const PLATEAU_WINDOW_DAYS = 21;
const LOW_ADHERENCE_THRESHOLD = 70;

// Relaciona resultado (peso parado) com causa provável (adesão baixa) —
// dois números reais, o tipo de conclusão que uma tela isolada não dá
// (docs/FASE-7-ROTINA.md, 1.5).
export const weightPlateauLowAdherence: InsightRule = {
  ruleId: "weight_plateau_low_adherence",
  requiredMetrics: ["body.weight.avg7d"],
  evaluate(store) {
    const series = store.metricSeries["body.weight.avg7d"];
    if (!series) return null;

    const window = series.slice(-PLATEAU_WINDOW_DAYS);
    const trend = analyzeTrend(window);
    if (trend.insufficientData || trend.direction !== "flat") return null;

    const last7 = store.recentDailySummaries.slice(-7);
    const adherenceValues = last7
      .map((s) => s.habitAdherencePct)
      .filter((v): v is number => v !== null);
    if (adherenceValues.length === 0) return null;

    const avgAdherence7d = mean(adherenceValues) as number;
    if (avgAdherence7d >= LOW_ADHERENCE_THRESHOLD) return null;

    const period = localDayBounds(store.day);
    return {
      ruleId: "weight_plateau_low_adherence",
      severity: "attention",
      title: "Peso parado e adesão baixa",
      body: `Seu peso está sem tendência clara há ${PLATEAU_WINDOW_DAYS} dias, e sua adesão à rotina nos últimos 7 dias está em ${avgAdherence7d.toFixed(0)}% — pode ser a causa.`,
      evidence: {
        plateauWindowDays: PLATEAU_WINDOW_DAYS,
        trendConfidence: trend.confidence,
        avgAdherence7d,
      },
      periodStart: period.start,
      periodEnd: period.end,
    };
  },
};

import { localDayBounds } from "@/engines/analytics/period";
import { mean } from "@/engines/analytics/stats/basic";
import type { InsightRule } from "../types";

// Precisa de pelo menos metade da janela de 7 dias com dado de proteína
// registrado pra a média não ser enganosa.
const MIN_DAYS_WITH_DATA = 4;

export const proteinBelowTarget: InsightRule = {
  ruleId: "protein_below_target",
  // "nutrition.protein.avg7d" ainda não está no catálogo do Analytics
  // Engine (nutrição com macros é Fase 5) — lido direto de
  // daily_summary.proteinG, por isso não há metric_id aqui.
  requiredMetrics: [],
  evaluate(store) {
    const goal = store.activeGoals.find(
      (g) => g.metricId === "nutrition.protein.avg7d",
    );
    if (!goal) return null;

    const last7 = store.recentDailySummaries.slice(-7);
    const values = last7
      .map((s) => s.proteinG)
      .filter((v): v is number => v !== null);
    if (values.length < MIN_DAYS_WITH_DATA) return null;

    const avg7d = mean(values) as number;
    if (avg7d >= goal.targetValue) return null;

    const period = localDayBounds(store.day);
    return {
      ruleId: "protein_below_target",
      severity: "info",
      title: "Proteína abaixo da meta",
      body: `Sua média de proteína nos últimos 7 dias é ${avg7d.toFixed(0)}g, abaixo da meta de ${goal.targetValue.toFixed(0)}g.`,
      evidence: {
        avgProtein7d: avg7d,
        target: goal.targetValue,
        daysWithData: values.length,
      },
      periodStart: period.start,
      periodEnd: period.end,
    };
  },
};

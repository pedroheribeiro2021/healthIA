import { localDayBounds } from "@/engines/analytics/period";
import { mean } from "@/engines/analytics/stats/basic";
import type { InsightRule } from "../types";

const LOW_ADHERENCE_THRESHOLD = 60;
const DROP_THRESHOLD_PP = 20;

// Lê habitAdherencePct direto de recentDailySummaries (populado por
// analyticsService.recomputeDay via computeHabitAdherenceDaily) — não
// precisa de habits/habitLogs no store (docs/FASE-7-ROTINA.md, 1.5).
export const habitAdherenceDrop: InsightRule = {
  ruleId: "habit_adherence_drop",
  requiredMetrics: [],
  evaluate(store) {
    const last7 = store.recentDailySummaries.slice(-7);
    const prev7 = store.recentDailySummaries.slice(-14, -7);

    const last7Values = last7
      .map((s) => s.habitAdherencePct)
      .filter((v): v is number => v !== null);
    if (last7Values.length === 0) return null;

    const avg7d = mean(last7Values) as number;

    const prev7Values = prev7
      .map((s) => s.habitAdherencePct)
      .filter((v): v is number => v !== null);
    const prevAvg7d = prev7Values.length > 0 ? (mean(prev7Values) as number) : null;

    const dropPp = prevAvg7d !== null ? prevAvg7d - avg7d : null;
    const isLow = avg7d < LOW_ADHERENCE_THRESHOLD;
    const isDropping = dropPp !== null && dropPp >= DROP_THRESHOLD_PP;
    if (!isLow && !isDropping) return null;

    const period = localDayBounds(store.day);
    return {
      ruleId: "habit_adherence_drop",
      severity: "attention",
      title: isLow ? "Adesão à rotina abaixo de 60%" : "Queda na adesão à rotina",
      body: isLow
        ? `Sua adesão aos hábitos nos últimos 7 dias está em ${avg7d.toFixed(0)}%.`
        : `Sua adesão caiu ${dropPp!.toFixed(0)} pontos percentuais em relação à semana anterior (${prevAvg7d!.toFixed(0)}% → ${avg7d.toFixed(0)}%).`,
      evidence: { avgAdherence7d: avg7d, prevAvgAdherence7d: prevAvg7d, dropPp },
      periodStart: period.start,
      periodEnd: period.end,
    };
  },
};

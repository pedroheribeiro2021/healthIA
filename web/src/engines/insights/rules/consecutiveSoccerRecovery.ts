import { addDays, localDayBounds, toLocalDay } from "@/engines/analytics/period";
import type { InsightRule } from "../types";

const RECOVERY_THRESHOLD = 60;

export const consecutiveSoccerRecovery: InsightRule = {
  ruleId: "consecutive_soccer_recovery",
  // Lido de daily_summary.recoveryScore (todaySummary), não de metricSeries
  // — listado aqui só como documentação da dependência real.
  requiredMetrics: ["recovery.score.daily"],
  evaluate(store) {
    const recoveryToday = store.todaySummary?.recoveryScore ?? null;
    if (recoveryToday === null || recoveryToday >= RECOVERY_THRESHOLD) {
      return null;
    }

    const daysToCheck = [addDays(store.day, -1), addDays(store.day, -2)];
    const playedSoccerBothDays = daysToCheck.every((day) =>
      store.recentWorkouts.some(
        (w) => toLocalDay(w.startTime) === day && w.detail?.sport === "soccer",
      ),
    );
    if (!playedSoccerBothDays) return null;

    const period = localDayBounds(store.day);
    return {
      ruleId: "consecutive_soccer_recovery",
      severity: "attention",
      title: "Recovery baixo após 2 dias seguidos de futebol",
      body: `Você jogou futebol em ${daysToCheck[1]} e ${daysToCheck[0]}, e seu recovery hoje está em ${recoveryToday.toFixed(0)}, abaixo de ${RECOVERY_THRESHOLD}.`,
      evidence: { recoveryToday, threshold: RECOVERY_THRESHOLD, soccerDays: daysToCheck },
      periodStart: period.start,
      periodEnd: period.end,
    };
  },
};

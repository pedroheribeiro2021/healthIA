import { addDays, localDayBounds } from "@/engines/analytics/period";
import { computeStreak } from "@/engines/habits/habitStats";
import type { InsightRule } from "../types";

const MIN_STREAK_TO_MOURN = 7;

// Dispara pro hábito `core` com a maior streak recém-quebrada: streak até
// ontem era >= 7 e hoje não foi cumprido (docs/FASE-7-ROTINA.md, 1.5).
// Severidade 'info' — é reconhecimento, não alerta: quebrar um streak não é
// uma métrica caindo fora da faixa, é só um fato que vale mostrar.
export const habitStreakBroken: InsightRule = {
  ruleId: "habit_streak_broken",
  requiredMetrics: [],
  evaluate(store) {
    const coreHabits = store.habits.filter((h) => h.priority === "core");
    if (coreHabits.length === 0) return null;

    let broken: { habitName: string; streak: number } | null = null;
    for (const habit of coreHabits) {
      const logsForHabit = store.recentHabitLogs.filter(
        (l) => l.habitId === habit.id,
      );
      const todayLog = logsForHabit.find((l) => l.day === store.day);
      const doneToday = todayLog?.done ?? false;
      if (doneToday) continue;

      const streakUntilYesterday = computeStreak(
        logsForHabit,
        addDays(store.day, -1),
      );
      if (streakUntilYesterday < MIN_STREAK_TO_MOURN) continue;
      if (!broken || streakUntilYesterday > broken.streak) {
        broken = { habitName: habit.name, streak: streakUntilYesterday };
      }
    }
    if (!broken) return null;

    const period = localDayBounds(store.day);
    return {
      ruleId: "habit_streak_broken",
      severity: "info",
      title: `Sequência de "${broken.habitName}" quebrada`,
      body: `Você tinha ${broken.streak} dias seguidos em "${broken.habitName}" e não marcou hoje.`,
      evidence: { habit: broken.habitName, streak: broken.streak },
      periodStart: period.start,
      periodEnd: period.end,
    };
  },
};

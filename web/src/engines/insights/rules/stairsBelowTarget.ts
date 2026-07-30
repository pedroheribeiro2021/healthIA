import { addDays, localDayBounds } from "@/engines/analytics/period";
import { countDoneInDays, daysOfIsoWeek } from "@/engines/habits/habitStats";
import type { InsightRule } from "../types";

const HABIT_SLUG = "escadas";

// "Semana fechada" = a semana ISO anterior à que contém `store.day` — só a
// primeira, plena, já pode ser avaliada (evita disparar no meio de uma
// semana em andamento, quando ainda dá tempo de cumprir a meta).
export const stairsBelowTarget: InsightRule = {
  ruleId: "stairs_below_target",
  requiredMetrics: [],
  evaluate(store) {
    const habit = store.habits.find((h) => h.slug === HABIT_SLUG);
    if (!habit) return null;

    const currentWeekStart = daysOfIsoWeek(store.day)[0];
    const closedWeekDays = daysOfIsoWeek(addDays(currentWeekStart, -1));

    const logsForHabit = store.recentHabitLogs.filter(
      (l) => l.habitId === habit.id,
    );
    const completed = countDoneInDays(logsForHabit, closedWeekDays);
    if (completed >= habit.targetPerWeek) return null;

    const period = {
      start: localDayBounds(closedWeekDays[0]).start,
      end: localDayBounds(closedWeekDays[closedWeekDays.length - 1]).end,
    };
    return {
      ruleId: "stairs_below_target",
      severity: "attention",
      title: "Escadas abaixo da meta semanal",
      body: `Na semana passada você subiu escadas ${completed} de ${habit.targetPerWeek} vezes previstas.`,
      evidence: {
        completed,
        target: habit.targetPerWeek,
        weekStart: closedWeekDays[0],
      },
      periodStart: period.start,
      periodEnd: period.end,
    };
  },
};

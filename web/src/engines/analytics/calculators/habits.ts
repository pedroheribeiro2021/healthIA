import type { MetricResult, Period } from "@/domain/analytics";
import type { Habit } from "@/domain/habits";

const ALGO_VERSION = "v1";

export type HabitDayStatus = {
  habit: Habit;
  // Já resolvido pelo chamador (log manual OU derivado de health_events,
  // OU excluído por já ter batido a meta semanal — ver
  // engines/habits/habitStats.ts, weeklyTargetAlreadyMetBeforeDay). Este
  // calculator só agrega, não decide "o que conta como feito".
  done: boolean;
};

// % dos hábitos `core` esperados hoje que foram cumpridos
// (docs/FASE-7-ROTINA.md, 1.3). Métrica composta: lê o resultado já
// resolvido de habits/habit_logs, não health_events diretamente — por isso
// requiredEventTypes: [] no catálogo.
export function computeHabitAdherenceDaily(
  statuses: readonly HabitDayStatus[],
  period: Period,
): MetricResult {
  // priority='bonus' nunca entra no denominador — é "meta ideal", não
  // obrigatória; penalizar por ela cria alarme falso.
  const eligible = statuses.filter((s) => s.habit.priority !== "bonus");

  // Sem nenhum hábito elegível (ex.: ainda não existe seed) => null, não 0.
  // Ausência de configuração não é ausência de comportamento.
  if (eligible.length === 0) {
    return {
      metricId: "habit.adherence.daily",
      periodStart: period.start,
      periodEnd: period.end,
      value: null,
      detail: { reason: "no_habits" },
      algoVersion: ALGO_VERSION,
    };
  }

  const doneCount = eligible.filter((s) => s.done).length;
  const value = (doneCount / eligible.length) * 100;

  return {
    metricId: "habit.adherence.daily",
    periodStart: period.start,
    periodEnd: period.end,
    value,
    detail: {
      doneCount,
      total: eligible.length,
      breakdown: eligible.map((s) => ({ slug: s.habit.slug, done: s.done })),
    },
    algoVersion: ALGO_VERSION,
  };
}

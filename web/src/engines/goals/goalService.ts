import type { LocalDay } from "@/domain/analytics";
import type { Goal } from "@/domain/goals";
import type { GoalRepository, MetricRepository } from "@/domain/repositories";
import { addDays } from "@/engines/analytics/period";
import { currentValueForGoal } from "./goalMetrics";

export type GoalWithProgress = { goal: Goal; currentValue: number | null };

// Busca (I/O) + cálculo puro (goalMetrics.currentValueForGoal) — mesmo
// formato de recommendationService/insightService: repos injetados,
// nenhuma regra de negócio na rota que chama isto.
export async function listGoalsWithProgress(
  goalRepo: GoalRepository,
  metricRepo: MetricRepository,
  today: LocalDay,
): Promise<GoalWithProgress[]> {
  const [goals, recentSummaries] = await Promise.all([
    goalRepo.listGoals(),
    metricRepo.listDailySummaries({ from: addDays(today, -6), to: today }),
  ]);

  return goals.map((goal) => ({
    goal,
    currentValue: currentValueForGoal(goal, recentSummaries),
  }));
}

import { todayLocalDay } from "@/engines/analytics/period";
import { listGoalsWithProgress } from "@/engines/goals/goalService";
import { GoalList } from "@/modules/metas/GoalList";
import { NewGoalForm } from "@/modules/metas/NewGoalForm";
import { createSupabaseGoalRepository } from "@/repositories/goalRepository";
import { createSupabaseMetricRepository } from "@/repositories/metricRepository";

export default async function MetasPage() {
  const [goalRepo, metricRepo] = await Promise.all([
    createSupabaseGoalRepository(),
    createSupabaseMetricRepository(),
  ]);

  const goals = await listGoalsWithProgress(goalRepo, metricRepo, todayLocalDay());
  const activeGoals = goals.filter((g) => g.goal.active);
  const inactiveGoals = goals.filter((g) => !g.goal.active);

  return (
    <main className="flex flex-1 flex-col items-center gap-8 bg-neutral-50 px-6 py-8 pb-20 dark:bg-neutral-950">
      <h1 className="w-full max-w-md text-lg font-semibold text-neutral-900 dark:text-neutral-100">
        Metas
      </h1>

      <section className="flex w-full max-w-md flex-col gap-3">
        <h2 className="text-sm font-medium text-neutral-500">Ativas</h2>
        <GoalList goals={activeGoals} />
      </section>

      <NewGoalForm />

      {inactiveGoals.length > 0 && (
        <section className="flex w-full max-w-md flex-col gap-3">
          <h2 className="text-sm font-medium text-neutral-500">Desativadas</h2>
          <GoalList goals={inactiveGoals} />
        </section>
      )}
    </main>
  );
}

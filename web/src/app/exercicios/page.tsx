import { addDays, todayLocalDay } from "@/engines/analytics/period";
import { getMetricSeries } from "@/engines/analytics/queries";
import { TrainingLoadChart } from "@/modules/exercicios/TrainingLoadChart";
import { WorkoutList } from "@/modules/exercicios/WorkoutList";
import { createSupabaseEventRepository } from "@/repositories/eventRepository";
import { createSupabaseMetricRepository } from "@/repositories/metricRepository";

export default async function ExerciciosPage() {
  const today = todayLocalDay();
  const eventRepo = await createSupabaseEventRepository();
  const metricRepo = await createSupabaseMetricRepository();

  const [{ series: loadSeries }, { series: acwrSeries }, workoutEvents] =
    await Promise.all([
      getMetricSeries(metricRepo, "training.load.daily", addDays(today, -29), today),
      getMetricSeries(metricRepo, "training.load.acwr", addDays(today, -29), today),
      eventRepo.listHealthEvents({ eventType: "workout" }),
    ]);

  return (
    <main className="flex flex-1 flex-col items-center gap-6 bg-neutral-50 px-6 py-8 pb-20 dark:bg-neutral-950">
      <h1 className="w-full max-w-md text-lg font-semibold text-neutral-900 dark:text-neutral-100">
        Exercícios
      </h1>
      <TrainingLoadChart loadSeries={loadSeries} acwrSeries={acwrSeries} />
      <WorkoutList events={workoutEvents} />
    </main>
  );
}

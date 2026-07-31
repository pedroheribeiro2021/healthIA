import { WeekComparisonCard } from "@/components/WeekComparisonCard";
import { compare } from "@/engines/analytics/comparisonEngine";
import { addDays, localDayBounds, todayLocalDay } from "@/engines/analytics/period";
import { getMetricSeries } from "@/engines/analytics/queries";
import { SleepDurationChart } from "@/modules/sono/SleepDurationChart";
import { createSupabaseMetricRepository } from "@/repositories/metricRepository";

export default async function SonoPage() {
  const metricRepo = await createSupabaseMetricRepository();
  const today = todayLocalDay();

  const { series, trend } = await getMetricSeries(
    metricRepo,
    "sleep.duration.daily",
    addDays(today, -29),
    today,
  );

  const [{ series: seriesA }, { series: seriesB }] = await Promise.all([
    getMetricSeries(metricRepo, "sleep.duration.daily", addDays(today, -6), today),
    getMetricSeries(
      metricRepo,
      "sleep.duration.daily",
      addDays(today, -13),
      addDays(today, -7),
    ),
  ]);
  const comparison = compare(
    "sleep.duration.daily",
    { start: localDayBounds(addDays(today, -6)).start, end: localDayBounds(today).end },
    seriesA,
    {
      start: localDayBounds(addDays(today, -13)).start,
      end: localDayBounds(addDays(today, -7)).end,
    },
    seriesB,
  );

  return (
    <main className="flex flex-1 flex-col items-center gap-6 bg-neutral-50 px-6 py-8 pb-20 dark:bg-neutral-950">
      <h1 className="w-full max-w-md text-lg font-semibold text-neutral-900 dark:text-neutral-100">
        Sono
      </h1>
      <SleepDurationChart series={series} trend={trend} />
      <WeekComparisonCard
        title="Duração do sono"
        comparison={comparison}
        formatValue={(value) => `${(value / 3600).toFixed(1)}h`}
      />
    </main>
  );
}

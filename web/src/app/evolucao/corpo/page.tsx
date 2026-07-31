import { getMetricSeries } from "@/engines/analytics/queries";
import { addDays, localDayBounds, todayLocalDay } from "@/engines/analytics/period";
import { BodyCompositionForm } from "@/modules/corpo/BodyCompositionForm";
import { BodyCompositionTrendCard } from "@/modules/corpo/BodyCompositionTrendCard";
import { WatchVsScaleChart } from "@/modules/corpo/WatchVsScaleChart";
import { createSupabaseEventRepository } from "@/repositories/eventRepository";
import { createSupabaseMetricRepository } from "@/repositories/metricRepository";

// Bioimpedância clínica costuma ser mensal (docs/ROADMAP.md) — janela mais
// larga que os outros módulos pra ter chance de mostrar mais de um ponto.
const WINDOW_DAYS = 180;

function latestValue(series: { value: number | null }[]): number | null {
  for (let i = series.length - 1; i >= 0; i--) {
    if (series[i].value !== null) return series[i].value;
  }
  return null;
}

export default async function CorpoPage() {
  const today = todayLocalDay();
  const from = addDays(today, -(WINDOW_DAYS - 1));

  const [eventRepo, metricRepo] = await Promise.all([
    createSupabaseEventRepository(),
    createSupabaseMetricRepository(),
  ]);

  const [bodyCompositionEvents, fatPct, leanMass] = await Promise.all([
    eventRepo.listHealthEvents({
      eventType: "body_composition",
      from: localDayBounds(from).start,
      to: localDayBounds(today).end,
    }),
    getMetricSeries(metricRepo, "body.fatpct.daily", from, today),
    getMetricSeries(metricRepo, "body.leanmass.daily", from, today),
  ]);

  const watchPoints = bodyCompositionEvents
    .filter((e) => e.detail?.origin === "watch" && typeof e.detail.bodyFatPercentage === "number")
    .map((e) => ({
      startTime: e.startTime,
      bodyFatPercentage: e.detail!.bodyFatPercentage as number,
    }));
  const clinicalPoints = bodyCompositionEvents
    .filter(
      (e) => e.detail?.origin === "clinical_bia" && typeof e.detail.bodyFatPercentage === "number",
    )
    .map((e) => ({
      startTime: e.startTime,
      bodyFatPercentage: e.detail!.bodyFatPercentage as number,
    }));

  return (
    <main className="flex flex-1 flex-col items-center gap-6 bg-neutral-50 px-6 py-8 pb-20 dark:bg-neutral-950">
      <h1 className="w-full max-w-md text-lg font-semibold text-neutral-900 dark:text-neutral-100">
        Corpo
      </h1>

      <div className="w-full max-w-md space-y-2">
        <p className="text-sm font-medium text-neutral-500">
          Percentual de gordura — relógio × bioimpedância clínica
        </p>
        <WatchVsScaleChart watch={watchPoints} clinical={clinicalPoints} />
      </div>

      <div className="grid w-full max-w-md grid-cols-2 gap-3">
        <BodyCompositionTrendCard
          label="Gordura corporal"
          latestValue={latestValue(fatPct.series)}
          unit="%"
          trend={fatPct.trend}
        />
        <BodyCompositionTrendCard
          label="Massa magra"
          latestValue={latestValue(leanMass.series)}
          unit=" kg"
          trend={leanMass.trend}
        />
      </div>

      <BodyCompositionForm />
    </main>
  );
}

import { listCorrelations } from "@/engines/insights/insightService";
import { addDays, localDayBounds, todayLocalDay } from "@/engines/analytics/period";
import { CorrelationList } from "@/modules/insights/CorrelationList";
import { InsightList } from "@/modules/insights/InsightList";
import { RecommendationList } from "@/modules/insights/RecommendationList";
import { createSupabaseInsightRepository } from "@/repositories/insightRepository";
import { createSupabaseMetricRepository } from "@/repositories/metricRepository";
import { createSupabaseRecommendationRepository } from "@/repositories/recommendationRepository";

export default async function InsightsPage() {
  const today = todayLocalDay();

  const [insightRepo, recommendationRepo, metricRepo] = await Promise.all([
    createSupabaseInsightRepository(),
    createSupabaseRecommendationRepository(),
    createSupabaseMetricRepository(),
  ]);

  const [insights, recommendations, correlations] = await Promise.all([
    insightRepo.listActive({
      from: localDayBounds(addDays(today, -29)).start,
      to: localDayBounds(today).end,
    }),
    recommendationRepo.listByStatus("open"),
    listCorrelations(metricRepo),
  ]);

  return (
    <main className="flex flex-1 flex-col items-center gap-8 bg-neutral-50 px-6 py-8 pb-20 dark:bg-neutral-950">
      <h1 className="w-full max-w-md text-lg font-semibold text-neutral-900 dark:text-neutral-100">
        Insights
      </h1>

      <section className="flex w-full max-w-md flex-col gap-3">
        <h2 className="text-sm font-medium text-neutral-500">Recomendações</h2>
        <RecommendationList recommendations={recommendations} />
      </section>

      <section className="flex w-full max-w-md flex-col gap-3">
        <h2 className="text-sm font-medium text-neutral-500">
          Insights recentes
        </h2>
        <InsightList insights={insights} />
      </section>

      <section className="flex w-full max-w-md flex-col gap-3">
        <h2 className="text-sm font-medium text-neutral-500">
          Correlações descobertas (últimos 60 dias)
        </h2>
        <CorrelationList correlations={correlations} />
      </section>
    </main>
  );
}

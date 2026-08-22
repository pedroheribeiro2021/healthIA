import type { Recommendation } from "@/domain/recommendations";
import { RecommendationCard } from "./RecommendationCard";

// Recomendações abertas já são no máximo 3 por dia (recommendationPolicy.ts),
// mas se acumulam sem serem concluídas — mesmo tratamento de "mostrar mais"
// do InsightList pra não virar parede de cards.
const VISIBLE_COUNT = 5;

export function RecommendationList({
  recommendations,
}: {
  recommendations: Recommendation[];
}) {
  if (recommendations.length === 0) {
    return (
      <div className="w-full max-w-md rounded-xl border border-dashed border-neutral-300 p-4 text-center text-sm text-neutral-500 dark:border-neutral-700">
        Nenhuma recomendação aberta agora.
      </div>
    );
  }

  const visible = recommendations.slice(0, VISIBLE_COUNT);
  const rest = recommendations.slice(VISIBLE_COUNT);

  return (
    <div className="flex w-full max-w-md flex-col gap-3">
      {visible.map((recommendation) => (
        <RecommendationCard key={recommendation.id} recommendation={recommendation} />
      ))}
      {rest.length > 0 && (
        <details className="rounded-xl border border-dashed border-neutral-300 dark:border-neutral-700">
          <summary className="cursor-pointer p-4 text-sm font-medium text-neutral-500">
            Mostrar mais {rest.length} recomendação{rest.length > 1 ? "ões" : ""}
          </summary>
          <div className="flex flex-col gap-3 p-4 pt-0">
            {rest.map((recommendation) => (
              <RecommendationCard key={recommendation.id} recommendation={recommendation} />
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

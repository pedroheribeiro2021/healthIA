import type { Recommendation } from "@/domain/recommendations";
import { RecommendationCard } from "./RecommendationCard";

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

  return (
    <div className="flex w-full max-w-md flex-col gap-3">
      {recommendations.map((recommendation) => (
        <RecommendationCard
          key={recommendation.id}
          recommendation={recommendation}
        />
      ))}
    </div>
  );
}

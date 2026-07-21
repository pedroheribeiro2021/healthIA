import type { LocalDay } from "@/domain/analytics";
import type { Recommendation } from "@/domain/recommendations";
import type {
  GoalRepository,
  InsightRepository,
  RecommendationRepository,
} from "@/domain/repositories";
import { addDays, localDayBounds } from "../analytics/period";
import { recommend } from "./recommendationPolicy";

// Insight de até 1 semana atrás ainda é relevante o bastante pra virar
// recomendação — mesma janela usada pelos comparativos semanais do app.
const ACTIVE_INSIGHT_WINDOW_DAYS = 7;

// Recalcula as recomendações a partir dos insights ativos recentes. Não
// fecha recomendações antigas sozinho (isso é ação do Pedro via
// POST /recommendations/{id}/done) — só evita duplicar quando um insight já
// tem uma recomendação aberta, e insere as novas que a política elegeu.
export async function refreshRecommendations(
  goalRepo: GoalRepository,
  insightRepo: InsightRepository,
  recommendationRepo: RecommendationRepository,
  day: LocalDay,
): Promise<Recommendation[]> {
  const windowStart = localDayBounds(
    addDays(day, -(ACTIVE_INSIGHT_WINDOW_DAYS - 1)),
  ).start;
  const windowEnd = localDayBounds(day).end;

  const [insights, goals] = await Promise.all([
    insightRepo.listActive({ from: windowStart, to: windowEnd }),
    goalRepo.listActiveGoals(),
  ]);

  const candidates = recommend(insights, goals);

  const persisted: Recommendation[] = [];
  for (const candidate of candidates) {
    const existing =
      candidate.insightId !== null
        ? await recommendationRepo.findOpenByInsightId(candidate.insightId)
        : null;
    persisted.push(
      existing ?? (await recommendationRepo.insertRecommendation(candidate)),
    );
  }
  return persisted;
}

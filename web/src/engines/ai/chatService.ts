import type { LocalDay } from "@/domain/analytics";
import type {
  GoalRepository,
  InsightRepository,
  MetricRepository,
  RecommendationRepository,
} from "@/domain/repositories";
import { addDays, localDayBounds } from "@/engines/analytics/period";
import { buildContext, type ChatContextData } from "./contextBuilder";

const SUMMARY_WINDOW_DAYS = 14;
const INSIGHT_WINDOW_DAYS = 30;

// I/O (busca via repositórios, mesmo padrão de insightService.buildMetricStore)
// + delega o cálculo do prompt pro buildContext puro.
export async function buildChatContext(
  repos: {
    metricRepo: MetricRepository;
    goalRepo: GoalRepository;
    insightRepo: InsightRepository;
    recommendationRepo: RecommendationRepository;
  },
  today: LocalDay,
): Promise<{ system: string }> {
  const [recentSummaries, activeGoals, activeInsights, openRecommendations] = await Promise.all([
    repos.metricRepo.listDailySummaries({
      from: addDays(today, -(SUMMARY_WINDOW_DAYS - 1)),
      to: today,
    }),
    repos.goalRepo.listActiveGoals(),
    repos.insightRepo.listActive({
      from: localDayBounds(addDays(today, -(INSIGHT_WINDOW_DAYS - 1))).start,
      to: localDayBounds(today).end,
    }),
    repos.recommendationRepo.listByStatus("open"),
  ]);

  const data: ChatContextData = {
    recentSummaries,
    activeGoals,
    activeInsights,
    openRecommendations,
  };

  return buildContext(data);
}

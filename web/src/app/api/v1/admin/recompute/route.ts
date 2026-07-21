import { NextResponse } from "next/server";
import { z } from "zod";
import { localDaySchema } from "@/domain/analytics";
import { recomputeRange } from "@/engines/analytics/analyticsService";
import { addDays } from "@/engines/analytics/period";
import { recomputeInsights } from "@/engines/insights/insightService";
import { refreshRecommendations } from "@/engines/recommendations/recommendationService";
import { createEventRepositoryFromClient } from "@/repositories/eventRepository";
import { createGoalRepositoryFromClient } from "@/repositories/goalRepository";
import { createInsightRepositoryFromClient } from "@/repositories/insightRepository";
import { createMetricRepositoryFromClient } from "@/repositories/metricRepository";
import { createRecommendationRepositoryFromClient } from "@/repositories/recommendationRepository";
import { authenticateRequest } from "@/repositories/supabase/auth";

const bodySchema = z.object({ from: localDaySchema, to: localDaySchema });

// Rota thin: recalcula metric_snapshots + daily_summary + insights de um
// intervalo de dias a partir de health_events, e as recomendações a partir
// dos insights resultantes. Usada pra popular histórico de uma vez (sem
// esperar o cron rodar dia a dia) e como caminho manual de reprocesso se um
// calculator/regra mudar de versão. Autenticação normal (cookie/Bearer) —
// é o Pedro disparando, não o cron.
export async function POST(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth) {
    return NextResponse.json({ error: "não autenticado" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "corpo inválido: JSON esperado" },
      { status: 400 },
    );
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "corpo inválido", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const eventRepo = createEventRepositoryFromClient(auth.client);
  const metricRepo = createMetricRepositoryFromClient(auth.client);
  const goalRepo = createGoalRepositoryFromClient(auth.client);
  const insightRepo = createInsightRepositoryFromClient(auth.client);
  const recommendationRepo = createRecommendationRepositoryFromClient(auth.client);

  const { from, to } = parsed.data;
  const analyticsResult = await recomputeRange(eventRepo, metricRepo, from, to);

  let day = from;
  let insightsTriggered = 0;
  while (day <= to) {
    const insights = await recomputeInsights(
      eventRepo,
      metricRepo,
      goalRepo,
      insightRepo,
      day,
    );
    insightsTriggered += insights.length;
    day = addDays(day, 1);
  }
  const recommendations = await refreshRecommendations(
    goalRepo,
    insightRepo,
    recommendationRepo,
    to,
  );

  return NextResponse.json(
    {
      ...analyticsResult,
      insightsTriggered,
      recommendationsOpen: recommendations.length,
    },
    { status: 200 },
  );
}

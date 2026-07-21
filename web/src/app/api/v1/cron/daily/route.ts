import { NextResponse } from "next/server";
import { recomputeDay } from "@/engines/analytics/analyticsService";
import { addDays, todayLocalDay } from "@/engines/analytics/period";
import { recomputeInsights } from "@/engines/insights/insightService";
import { refreshRecommendations } from "@/engines/recommendations/recommendationService";
import { createEventRepositoryFromClient } from "@/repositories/eventRepository";
import { createGoalRepositoryFromClient } from "@/repositories/goalRepository";
import { createInsightRepositoryFromClient } from "@/repositories/insightRepository";
import { createMetricRepositoryFromClient } from "@/repositories/metricRepository";
import { createRecommendationRepositoryFromClient } from "@/repositories/recommendationRepository";
import { createSupabaseServiceRoleClient } from "@/repositories/supabase/serviceRoleClient";

// Vercel Cron (web/vercel.json) chama essa rota 1x/dia e injeta
// `Authorization: Bearer ${CRON_SECRET}` automaticamente quando essa env
// var está configurada no projeto (Vercel → Settings → Environment
// Variables). Não há usuário autenticado aqui — usa service_role
// (docs/ARCHITECTURE.md: "cron usa service_role, nunca exposto ao
// cliente"), não authenticateRequest.
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "não autenticado" }, { status: 401 });
  }

  const supabase = createSupabaseServiceRoleClient();
  const eventRepo = createEventRepositoryFromClient(supabase);
  const metricRepo = createMetricRepositoryFromClient(supabase);
  const goalRepo = createGoalRepositoryFromClient(supabase);
  const insightRepo = createInsightRepositoryFromClient(supabase);
  const recommendationRepo = createRecommendationRepositoryFromClient(supabase);

  // Recalcula o dia anterior (docs/ARCHITECTURE.md) — quando o cron roda de
  // manhã, o dia de ontem já está completo (sono, treinos etc.). Pipeline
  // completa: Analytics -> Insights -> Recommendations (docs/ENGINES.md).
  const day = addDays(todayLocalDay(), -1);
  const summary = await recomputeDay(eventRepo, metricRepo, day);
  const insights = await recomputeInsights(
    eventRepo,
    metricRepo,
    goalRepo,
    insightRepo,
    day,
  );
  const recommendations = await refreshRecommendations(
    goalRepo,
    insightRepo,
    recommendationRepo,
    day,
  );

  return NextResponse.json(
    {
      day,
      recoveryScore: summary.recoveryScore,
      insightsTriggered: insights.length,
      recommendationsOpen: recommendations.length,
    },
    { status: 200 },
  );
}

import { NextResponse } from "next/server";
import { recomputeDay } from "@/engines/analytics/analyticsService";
import { addDays, todayLocalDay } from "@/engines/analytics/period";
import { createEventRepositoryFromClient } from "@/repositories/eventRepository";
import { createMetricRepositoryFromClient } from "@/repositories/metricRepository";
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

  // Recalcula o dia anterior (docs/ARCHITECTURE.md) — quando o cron roda de
  // manhã, o dia de ontem já está completo (sono, treinos etc.).
  const day = addDays(todayLocalDay(), -1);
  const summary = await recomputeDay(eventRepo, metricRepo, day);

  return NextResponse.json(
    { day, recoveryScore: summary.recoveryScore },
    { status: 200 },
  );
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { localDaySchema } from "@/domain/analytics";
import { recomputeRange } from "@/engines/analytics/analyticsService";
import { createEventRepositoryFromClient } from "@/repositories/eventRepository";
import { createMetricRepositoryFromClient } from "@/repositories/metricRepository";
import { authenticateRequest } from "@/repositories/supabase/auth";

const bodySchema = z.object({ from: localDaySchema, to: localDaySchema });

// Rota thin: recalcula metric_snapshots + daily_summary de um intervalo de
// dias a partir de health_events. Usada pra popular histórico de uma vez
// (sem esperar o cron rodar dia a dia) e como caminho manual de reprocesso
// se um calculator mudar de versão. Autenticação normal (cookie/Bearer) —
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
  const result = await recomputeRange(
    eventRepo,
    metricRepo,
    parsed.data.from,
    parsed.data.to,
  );

  return NextResponse.json(result, { status: 200 });
}

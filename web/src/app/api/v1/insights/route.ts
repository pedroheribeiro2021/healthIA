import { NextResponse } from "next/server";
import { z } from "zod";
import { localDaySchema } from "@/domain/analytics";
import { addDays, localDayBounds, todayLocalDay } from "@/engines/analytics/period";
import { createInsightRepositoryFromClient } from "@/repositories/insightRepository";
import { authenticateRequest } from "@/repositories/supabase/auth";

const DEFAULT_WINDOW_DAYS = 30;

const querySchema = z.object({
  from: localDaySchema.optional(),
  to: localDaySchema.optional(),
});

// `active=true` (docs/ENGINES.md) é o único modo suportado hoje — não há
// ainda uma ação de dispensar insight (só recomendações têm /done), então
// a rota sempre retorna os não-dismissados dentro da janela.
export async function GET(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth) {
    return NextResponse.json({ error: "não autenticado" }, { status: 401 });
  }

  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    from: url.searchParams.get("from") ?? undefined,
    to: url.searchParams.get("to") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: "parâmetros inválidos", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const to = parsed.data.to ?? todayLocalDay();
  const from = parsed.data.from ?? addDays(to, -(DEFAULT_WINDOW_DAYS - 1));

  const insightRepo = createInsightRepositoryFromClient(auth.client);
  const insights = await insightRepo.listActive({
    from: localDayBounds(from).start,
    to: localDayBounds(to).end,
  });

  return NextResponse.json(insights, { status: 200 });
}

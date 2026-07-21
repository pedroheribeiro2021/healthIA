import { NextResponse } from "next/server";
import { z } from "zod";
import { localDaySchema } from "@/domain/analytics";
import { createMetricRepositoryFromClient } from "@/repositories/metricRepository";
import { authenticateRequest } from "@/repositories/supabase/auth";

const querySchema = z.object({ from: localDaySchema, to: localDaySchema });

export async function GET(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth) {
    return NextResponse.json({ error: "não autenticado" }, { status: 401 });
  }

  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    from: url.searchParams.get("from"),
    to: url.searchParams.get("to"),
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: "parâmetros inválidos", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const metricRepo = createMetricRepositoryFromClient(auth.client);
  const summaries = await metricRepo.listDailySummaries(parsed.data);

  return NextResponse.json(summaries, { status: 200 });
}

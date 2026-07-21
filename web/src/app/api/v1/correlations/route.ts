import { NextResponse } from "next/server";
import { z } from "zod";
import { listCorrelations } from "@/engines/insights/insightService";
import { createMetricRepositoryFromClient } from "@/repositories/metricRepository";
import { authenticateRequest } from "@/repositories/supabase/auth";

const querySchema = z.object({
  minConfidence: z.coerce.number().min(0).max(1).optional(),
});

export async function GET(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth) {
    return NextResponse.json({ error: "não autenticado" }, { status: 401 });
  }

  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    minConfidence: url.searchParams.get("minConfidence") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: "parâmetros inválidos", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const metricRepo = createMetricRepositoryFromClient(auth.client);
  const correlations = await listCorrelations(metricRepo, {
    minConfidence: parsed.data.minConfidence,
  });

  return NextResponse.json(correlations, { status: 200 });
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { localDaySchema } from "@/domain/analytics";
import { isValidMetricId } from "@/engines/analytics/catalog";
import { getMetricSeries } from "@/engines/analytics/queries";
import { createMetricRepositoryFromClient } from "@/repositories/metricRepository";
import { authenticateRequest } from "@/repositories/supabase/auth";

const querySchema = z.object({ from: localDaySchema, to: localDaySchema });

export async function GET(
  request: Request,
  { params }: { params: Promise<{ metricId: string }> },
) {
  const auth = await authenticateRequest(request);
  if (!auth) {
    return NextResponse.json({ error: "não autenticado" }, { status: 401 });
  }

  const { metricId } = await params;
  if (!isValidMetricId(metricId)) {
    return NextResponse.json(
      { error: `metric_id desconhecido: ${metricId}` },
      { status: 400 },
    );
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
  const result = await getMetricSeries(
    metricRepo,
    metricId,
    parsed.data.from,
    parsed.data.to,
  );

  return NextResponse.json(result, { status: 200 });
}

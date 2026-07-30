import { NextResponse } from "next/server";
import { z } from "zod";
import { localDaySchema } from "@/domain/analytics";
import { reportKindSchema } from "@/domain/reports";
import { todayLocalDay } from "@/engines/analytics/period";
import { generateReport } from "@/engines/reports/reportService";
import { createGoalRepositoryFromClient } from "@/repositories/goalRepository";
import { createMetricRepositoryFromClient } from "@/repositories/metricRepository";
import { authenticateRequest } from "@/repositories/supabase/auth";

const querySchema = z.object({
  type: reportKindSchema.default("weekly"),
  day: localDaySchema.optional(),
});

export async function GET(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth) {
    return NextResponse.json({ error: "não autenticado" }, { status: 401 });
  }

  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    type: url.searchParams.get("type") ?? undefined,
    day: url.searchParams.get("day") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: "query inválida", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const metricRepo = createMetricRepositoryFromClient(auth.client);
  const goalRepo = createGoalRepositoryFromClient(auth.client);
  const report = await generateReport(
    metricRepo,
    goalRepo,
    parsed.data.type,
    parsed.data.day ?? todayLocalDay(),
  );

  return NextResponse.json(report, { status: 200 });
}

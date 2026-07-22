import { NextResponse } from "next/server";
import { z } from "zod";
import { newGoalInputSchema } from "@/domain/goals";
import { isValidGoalMetricId } from "@/engines/goals/goalMetrics";
import { createGoalRepositoryFromClient } from "@/repositories/goalRepository";
import { authenticateRequest } from "@/repositories/supabase/auth";

const querySchema = z.object({
  active: z.enum(["true", "false"]).optional(),
});

export async function GET(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth) {
    return NextResponse.json({ error: "não autenticado" }, { status: 401 });
  }

  const url = new URL(request.url);
  const parsedQuery = querySchema.safeParse({
    active: url.searchParams.get("active") ?? undefined,
  });
  if (!parsedQuery.success) {
    return NextResponse.json(
      { error: "query inválida", issues: parsedQuery.error.issues },
      { status: 400 },
    );
  }

  const goalRepo = createGoalRepositoryFromClient(auth.client);
  const goals =
    parsedQuery.data.active === "true"
      ? await goalRepo.listActiveGoals()
      : await goalRepo.listGoals();

  return NextResponse.json(goals, { status: 200 });
}

export async function POST(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth) {
    return NextResponse.json({ error: "não autenticado" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "corpo inválido: JSON esperado" }, { status: 400 });
  }

  const parsed = newGoalInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "corpo inválido", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  if (!isValidGoalMetricId(parsed.data.metricId)) {
    return NextResponse.json(
      { error: "metric_id não suportado como meta" },
      { status: 400 },
    );
  }

  const goalRepo = createGoalRepositoryFromClient(auth.client);
  const goal = await goalRepo.createGoal(parsed.data);

  return NextResponse.json(goal, { status: 201 });
}

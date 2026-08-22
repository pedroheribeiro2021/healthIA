import { NextResponse } from "next/server";
import { updateGoalInputSchema } from "@/domain/goals";
import { createGoalRepositoryFromClient } from "@/repositories/goalRepository";
import { authenticateRequest } from "@/repositories/supabase/auth";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await authenticateRequest(request);
  if (!auth) {
    return NextResponse.json({ error: "não autenticado" }, { status: 401 });
  }

  const { id } = await params;
  const goalId = Number(id);
  if (!Number.isInteger(goalId)) {
    return NextResponse.json({ error: "id inválido" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "corpo inválido: JSON esperado" }, { status: 400 });
  }

  const parsed = updateGoalInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "corpo inválido", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const goalRepo = createGoalRepositoryFromClient(auth.client);
  const updated = await goalRepo.updateGoal(goalId, parsed.data);

  return NextResponse.json(updated, { status: 200 });
}

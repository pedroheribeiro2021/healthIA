import { NextResponse } from "next/server";
import { createGoalRepositoryFromClient } from "@/repositories/goalRepository";
import { authenticateRequest } from "@/repositories/supabase/auth";

export async function POST(
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

  const goalRepo = createGoalRepositoryFromClient(auth.client);
  const updated = await goalRepo.deactivateGoal(goalId);

  return NextResponse.json(updated, { status: 200 });
}

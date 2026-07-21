import { NextResponse } from "next/server";
import { createRecommendationRepositoryFromClient } from "@/repositories/recommendationRepository";
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
  const recommendationId = Number(id);
  if (!Number.isInteger(recommendationId)) {
    return NextResponse.json({ error: "id inválido" }, { status: 400 });
  }

  const recommendationRepo = createRecommendationRepositoryFromClient(auth.client);
  const updated = await recommendationRepo.updateStatus(recommendationId, "done");

  return NextResponse.json(updated, { status: 200 });
}

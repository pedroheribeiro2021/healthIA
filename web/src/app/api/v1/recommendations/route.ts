import { NextResponse } from "next/server";
import { z } from "zod";
import { recommendationStatusSchema } from "@/domain/recommendations";
import { createRecommendationRepositoryFromClient } from "@/repositories/recommendationRepository";
import { authenticateRequest } from "@/repositories/supabase/auth";

const querySchema = z.object({ status: recommendationStatusSchema.default("open") });

export async function GET(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth) {
    return NextResponse.json({ error: "não autenticado" }, { status: 401 });
  }

  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    status: url.searchParams.get("status") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: "parâmetros inválidos", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const recommendationRepo = createRecommendationRepositoryFromClient(auth.client);
  const recommendations = await recommendationRepo.listByStatus(parsed.data.status);

  return NextResponse.json(recommendations, { status: 200 });
}

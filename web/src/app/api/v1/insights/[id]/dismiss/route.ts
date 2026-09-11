import { NextResponse } from "next/server";
import { createInsightRepositoryFromClient } from "@/repositories/insightRepository";
import { authenticateRequest } from "@/repositories/supabase/auth";

// Mesmo padrão de recommendations/[id]/done: rota thin, um update simples.
// dismissed=true não é regra de negócio — não há reavaliação nem efeito
// colateral em outra tabela, então não precisa de um service dedicado.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await authenticateRequest(request);
  if (!auth) {
    return NextResponse.json({ error: "não autenticado" }, { status: 401 });
  }

  const { id } = await params;
  const insightId = Number(id);
  if (!Number.isInteger(insightId)) {
    return NextResponse.json({ error: "id inválido" }, { status: 400 });
  }

  const insightRepo = createInsightRepositoryFromClient(auth.client);
  const updated = await insightRepo.dismissInsight(insightId);

  return NextResponse.json(updated, { status: 200 });
}

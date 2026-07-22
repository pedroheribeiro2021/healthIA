import { NextResponse } from "next/server";
import { getRecipeWithMacros } from "@/engines/nutrition/recipeService";
import { createRecipeRepositoryFromClient } from "@/repositories/recipeRepository";
import { authenticateRequest } from "@/repositories/supabase/auth";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await authenticateRequest(request);
  if (!auth) {
    return NextResponse.json({ error: "não autenticado" }, { status: 401 });
  }

  const { id } = await params;
  const recipeId = Number(id);
  if (!Number.isInteger(recipeId)) {
    return NextResponse.json({ error: "id inválido" }, { status: 400 });
  }

  const recipeRepo = createRecipeRepositoryFromClient(auth.client);
  const result = await getRecipeWithMacros(recipeRepo, recipeId);
  if (!result) {
    return NextResponse.json({ error: "receita não encontrada" }, { status: 404 });
  }

  return NextResponse.json(result, { status: 200 });
}

import { NextResponse } from "next/server";
import { newRecipeInputSchema } from "@/domain/nutrition";
import { createRecipeRepositoryFromClient } from "@/repositories/recipeRepository";
import { authenticateRequest } from "@/repositories/supabase/auth";

export async function GET(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth) {
    return NextResponse.json({ error: "não autenticado" }, { status: 401 });
  }

  const recipeRepo = createRecipeRepositoryFromClient(auth.client);
  const recipes = await recipeRepo.listRecipes();

  return NextResponse.json(recipes, { status: 200 });
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

  const parsed = newRecipeInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "corpo inválido", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const recipeRepo = createRecipeRepositoryFromClient(auth.client);
  const recipe = await recipeRepo.createRecipe(parsed.data);

  return NextResponse.json(recipe, { status: 201 });
}

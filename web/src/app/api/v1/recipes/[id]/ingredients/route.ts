import { NextResponse } from "next/server";
import { addIngredientInputSchema } from "@/domain/nutrition";
import { addIngredientToRecipe } from "@/engines/nutrition/recipeService";
import { createFoodRepositoryFromClient } from "@/repositories/foodRepository";
import { createRecipeRepositoryFromClient } from "@/repositories/recipeRepository";
import { authenticateRequest } from "@/repositories/supabase/auth";

// Rota thin: resolve o alimento e congela os macros no ingrediente
// (engines/nutrition/recipeService.ts) — nenhuma regra de negócio aqui.
export async function POST(
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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "corpo inválido: JSON esperado" }, { status: 400 });
  }

  const parsed = addIngredientInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "corpo inválido", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const foodRepo = createFoodRepositoryFromClient(auth.client);
  const recipeRepo = createRecipeRepositoryFromClient(auth.client);

  try {
    const ingredient = await addIngredientToRecipe(
      foodRepo,
      recipeRepo,
      recipeId,
      parsed.data,
    );
    return NextResponse.json(ingredient, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 404 });
  }
}

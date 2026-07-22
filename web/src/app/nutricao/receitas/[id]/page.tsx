import { notFound } from "next/navigation";
import { getRecipeWithMacros } from "@/engines/nutrition/recipeService";
import { AddIngredientForm } from "@/modules/nutricao/AddIngredientForm";
import { RecipeMacrosSummary } from "@/modules/nutricao/RecipeMacrosSummary";
import { createSupabaseRecipeRepository } from "@/repositories/recipeRepository";

export default async function RecipeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const recipeId = Number(id);
  if (!Number.isInteger(recipeId)) notFound();

  const recipeRepo = await createSupabaseRecipeRepository();
  const result = await getRecipeWithMacros(recipeRepo, recipeId);
  if (!result) notFound();

  return (
    <main className="flex flex-1 flex-col items-center gap-6 bg-neutral-50 px-6 py-8 pb-20 dark:bg-neutral-950">
      <div className="w-full max-w-md">
        <h1 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
          {result.recipe.name}
        </h1>
        {result.recipe.instructions && (
          <p className="mt-1 text-sm text-neutral-500">{result.recipe.instructions}</p>
        )}
      </div>

      <RecipeMacrosSummary result={result} />
      <AddIngredientForm recipeId={recipeId} />
    </main>
  );
}

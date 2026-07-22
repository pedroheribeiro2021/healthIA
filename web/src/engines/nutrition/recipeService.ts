import type { Macros } from "@/domain/nutrition";
import type { Recipe, RecipeIngredient } from "@/domain/nutrition";
import type { FoodRepository, RecipeRepository } from "@/domain/repositories";
import { perServing, scaleMacros, sumMacros } from "./macros";

function ingredientMacros(ingredient: RecipeIngredient): Macros | null {
  if (
    ingredient.kcal === null ||
    ingredient.proteinG === null ||
    ingredient.carbsG === null ||
    ingredient.fatG === null
  ) {
    return null;
  }
  return {
    kcal: ingredient.kcal,
    proteinG: ingredient.proteinG,
    carbsG: ingredient.carbsG,
    fatG: ingredient.fatG,
  };
}

// Resolve o alimento da base e congela os macros da quantidade informada
// no próprio ingrediente (docs/DATA_MODEL.md: recipe_ingredients guarda
// kcal/protein_g/carbs_g/fat_g, não uma FK viva pra `foods` — ver
// domain/nutrition.ts). Unidade sempre grama nesta v1 (evita conversão de
// unidade tipo "1 unidade" de ovo; expandir depois se precisar).
export async function addIngredientToRecipe(
  foodRepo: FoodRepository,
  recipeRepo: RecipeRepository,
  recipeId: number,
  input: { foodId: number; quantityG: number },
): Promise<RecipeIngredient> {
  const food = await foodRepo.getFoodById(input.foodId);
  if (!food) {
    throw new Error(`food ${input.foodId} não encontrado`);
  }

  const macros = scaleMacros(food.per100g, input.quantityG);
  return recipeRepo.addIngredient({
    recipeId,
    foodName: food.name,
    quantity: input.quantityG,
    unit: "g",
    kcal: macros.kcal,
    proteinG: macros.proteinG,
    carbsG: macros.carbsG,
    fatG: macros.fatG,
  });
}

export type RecipeWithMacros = {
  recipe: Recipe;
  ingredients: RecipeIngredient[];
  totalMacros: Macros;
  perServingMacros: Macros;
};

// "Receita cadastrada calcula macros sozinha" (docs/ROADMAP.md Fase 5,
// critério de pronto): soma os macros já congelados de cada ingrediente e
// divide pelas porções — nenhum recálculo contra a base de alimentos aqui.
export async function getRecipeWithMacros(
  recipeRepo: RecipeRepository,
  recipeId: number,
): Promise<RecipeWithMacros | null> {
  const recipe = await recipeRepo.getRecipe(recipeId);
  if (!recipe) return null;

  const ingredients = await recipeRepo.listIngredients(recipeId);
  const totalMacros = sumMacros(ingredients.map(ingredientMacros));
  const perServingMacros = perServing(totalMacros, recipe.servings);

  return { recipe, ingredients, totalMacros, perServingMacros };
}

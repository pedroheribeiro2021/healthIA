import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  NewRecipeIngredient,
  NewRecipeInput,
  Recipe,
  RecipeIngredient,
  RecipeSource,
} from "@/domain/nutrition";
import type { RecipeRepository } from "@/domain/repositories";
import type { Database } from "./supabase/databaseTypes";
import { createSupabaseServerClient } from "./supabase/serverClient";

function toRecipe(row: {
  id: number;
  name: string;
  servings: number;
  instructions: string | null;
  source: string;
  archived: boolean;
  created_at: string;
}): Recipe {
  return {
    id: row.id,
    name: row.name,
    servings: row.servings,
    instructions: row.instructions,
    source: row.source as RecipeSource,
    archived: row.archived,
    createdAt: row.created_at,
  };
}

function toRecipeIngredient(row: {
  id: number;
  recipe_id: number;
  food_name: string;
  quantity: number;
  unit: string;
  kcal: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
}): RecipeIngredient {
  return {
    id: row.id,
    recipeId: row.recipe_id,
    foodName: row.food_name,
    quantity: row.quantity,
    unit: row.unit,
    kcal: row.kcal,
    proteinG: row.protein_g,
    carbsG: row.carbs_g,
    fatG: row.fat_g,
  };
}

// Fábrica pura, mesmo padrão de eventRepository.ts.
export function createRecipeRepositoryFromClient(
  supabase: SupabaseClient<Database, "healthia">,
): RecipeRepository {
  return {
    async createRecipe(input: NewRecipeInput): Promise<Recipe> {
      const { data, error } = await supabase
        .from("recipes")
        .insert({
          name: input.name,
          servings: input.servings,
          instructions: input.instructions ?? null,
        })
        .select()
        .single();

      if (error) throw error;
      return toRecipe(data);
    },

    async listRecipes(): Promise<Recipe[]> {
      const { data, error } = await supabase
        .from("recipes")
        .select()
        .eq("archived", false)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data.map(toRecipe);
    },

    async getRecipe(id): Promise<Recipe | null> {
      const { data, error } = await supabase.from("recipes").select().eq("id", id).maybeSingle();
      if (error) throw error;
      return data ? toRecipe(data) : null;
    },

    async addIngredient(ingredient: NewRecipeIngredient): Promise<RecipeIngredient> {
      const { data, error } = await supabase
        .from("recipe_ingredients")
        .insert({
          recipe_id: ingredient.recipeId,
          food_name: ingredient.foodName,
          quantity: ingredient.quantity,
          unit: ingredient.unit,
          kcal: ingredient.kcal,
          protein_g: ingredient.proteinG,
          carbs_g: ingredient.carbsG,
          fat_g: ingredient.fatG,
        })
        .select()
        .single();

      if (error) throw error;
      return toRecipeIngredient(data);
    },

    async listIngredients(recipeId): Promise<RecipeIngredient[]> {
      const { data, error } = await supabase
        .from("recipe_ingredients")
        .select()
        .eq("recipe_id", recipeId);

      if (error) throw error;
      return data.map(toRecipeIngredient);
    },
  };
}

export async function createSupabaseRecipeRepository(): Promise<RecipeRepository> {
  const supabase = await createSupabaseServerClient();
  return createRecipeRepositoryFromClient(supabase);
}

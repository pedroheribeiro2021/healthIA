import { NewRecipeForm } from "@/modules/nutricao/NewRecipeForm";
import { RecipeList } from "@/modules/nutricao/RecipeList";
import { ShoppingList } from "@/modules/nutricao/ShoppingList";
import { createSupabaseRecipeRepository } from "@/repositories/recipeRepository";
import { createSupabaseShoppingListRepository } from "@/repositories/shoppingListRepository";

export default async function NutricaoPage() {
  const [recipeRepo, shoppingListRepo] = await Promise.all([
    createSupabaseRecipeRepository(),
    createSupabaseShoppingListRepository(),
  ]);

  const [recipes, shoppingListItems] = await Promise.all([
    recipeRepo.listRecipes(),
    shoppingListRepo.listByStatus("open"),
  ]);

  return (
    <main className="flex flex-1 flex-col items-center gap-8 bg-neutral-50 px-6 py-8 pb-20 dark:bg-neutral-950">
      <h1 className="w-full max-w-md text-lg font-semibold text-neutral-900 dark:text-neutral-100">
        Nutrição
      </h1>

      <section className="flex w-full max-w-md flex-col gap-3">
        <p className="text-sm font-medium text-neutral-500">Receitas</p>
        <RecipeList recipes={recipes} />
      </section>

      <NewRecipeForm />

      <ShoppingList items={shoppingListItems} />
    </main>
  );
}

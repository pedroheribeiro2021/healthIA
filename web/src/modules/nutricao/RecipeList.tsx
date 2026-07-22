import Link from "next/link";
import type { Recipe } from "@/domain/nutrition";

export function RecipeList({ recipes }: { recipes: Recipe[] }) {
  if (recipes.length === 0) {
    return (
      <p className="w-full max-w-md text-sm text-neutral-400">
        Nenhuma receita cadastrada ainda.
      </p>
    );
  }

  return (
    <ul className="flex w-full max-w-md flex-col gap-2">
      {recipes.map((recipe) => (
        <li key={recipe.id}>
          <Link
            href={`/nutricao/receitas/${recipe.id}`}
            className="flex items-center justify-between rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900"
          >
            <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
              {recipe.name}
            </span>
            <span className="text-xs text-neutral-400">
              {recipe.servings} {recipe.servings === 1 ? "porção" : "porções"}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

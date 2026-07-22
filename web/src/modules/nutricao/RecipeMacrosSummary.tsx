import type { RecipeWithMacros } from "@/engines/nutrition/recipeService";

function MacroTile({ label, value, unit }: { label: string; value: number; unit: string }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-3 text-center dark:border-neutral-800 dark:bg-neutral-900">
      <p className="text-xs text-neutral-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-neutral-900 dark:text-neutral-100">
        {value.toFixed(0)}
        <span className="text-xs font-normal text-neutral-400">{unit}</span>
      </p>
    </div>
  );
}

// Server Component puro: recebe os macros já somados/divididos por
// engines/nutrition/recipeService.ts (getRecipeWithMacros) — "receita
// cadastrada calcula macros sozinha" (docs/ROADMAP.md Fase 5).
export function RecipeMacrosSummary({ result }: { result: RecipeWithMacros }) {
  return (
    <div className="w-full max-w-md space-y-3">
      <p className="text-sm font-medium text-neutral-500">
        Por porção ({result.recipe.servings}{" "}
        {result.recipe.servings === 1 ? "porção" : "porções"} no total)
      </p>
      <div className="grid grid-cols-4 gap-2">
        <MacroTile label="kcal" value={result.perServingMacros.kcal} unit="" />
        <MacroTile label="proteína" value={result.perServingMacros.proteinG} unit="g" />
        <MacroTile label="carbo" value={result.perServingMacros.carbsG} unit="g" />
        <MacroTile label="gordura" value={result.perServingMacros.fatG} unit="g" />
      </div>

      <p className="text-sm font-medium text-neutral-500">Ingredientes</p>
      {result.ingredients.length === 0 ? (
        <p className="text-sm text-neutral-400">Nenhum ingrediente ainda.</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {result.ingredients.map((ingredient) => (
            <li
              key={ingredient.id}
              className="flex justify-between rounded-md border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-800"
            >
              <span>
                {ingredient.foodName} — {ingredient.quantity}
                {ingredient.unit}
              </span>
              {ingredient.kcal !== null && (
                <span className="text-neutral-400">{ingredient.kcal.toFixed(0)} kcal</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

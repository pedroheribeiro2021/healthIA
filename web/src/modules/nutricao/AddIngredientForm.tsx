"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { Food } from "@/domain/nutrition";

const inputClass =
  "w-full rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800";

const SEARCH_DEBOUNCE_MS = 300;

export function AddIngredientForm({ recipeId }: { recipeId: number }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Food[]>([]);
  const [selectedFood, setSelectedFood] = useState<Food | null>(null);
  const [quantityG, setQuantityG] = useState("100");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const searchActive = query.trim().length >= 2 && !selectedFood;

  useEffect(() => {
    if (!searchActive) return;
    const timeout = setTimeout(async () => {
      const response = await fetch(`/api/v1/foods?search=${encodeURIComponent(query)}`);
      if (response.ok) setResults(await response.json());
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timeout);
  }, [query, searchActive]);

  const visibleResults = searchActive ? results : [];

  function handleSelect(food: Food) {
    setSelectedFood(food);
    setQuery(food.name);
    setResults([]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedFood) {
      setFeedback("Selecione um alimento da lista.");
      return;
    }
    setSubmitting(true);
    setFeedback(null);

    try {
      const response = await fetch(`/api/v1/recipes/${recipeId}/ingredients`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ foodId: selectedFood.id, quantityG: Number(quantityG) }),
      });
      if (!response.ok) throw new Error("Falha ao adicionar");

      setSelectedFood(null);
      setQuery("");
      setQuantityG("100");
      router.refresh();
    } catch {
      setFeedback("Não foi possível adicionar. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-md space-y-3 rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900"
    >
      <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
        Adicionar ingrediente
      </p>

      <div className="relative space-y-1">
        <input
          type="text"
          placeholder="Buscar alimento..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSelectedFood(null);
          }}
          className={inputClass}
        />
        {visibleResults.length > 0 && (
          <ul className="absolute z-10 max-h-48 w-full overflow-y-auto rounded-md border border-neutral-200 bg-white shadow-lg dark:border-neutral-700 dark:bg-neutral-800">
            {visibleResults.map((food) => (
              <li key={food.id}>
                <button
                  type="button"
                  onClick={() => handleSelect(food)}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-neutral-100 dark:hover:bg-neutral-700"
                >
                  {food.name}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex items-center gap-2">
        <input
          type="number"
          inputMode="decimal"
          step="1"
          min="1"
          max="10000"
          value={quantityG}
          onChange={(e) => setQuantityG(e.target.value)}
          className={`${inputClass} w-24`}
        />
        <span className="text-sm text-neutral-500">gramas</span>
      </div>

      {feedback && <p className="text-sm text-red-600">{feedback}</p>}

      <button
        type="submit"
        disabled={submitting || !selectedFood}
        className="w-full rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900"
      >
        {submitting ? "Adicionando..." : "Adicionar"}
      </button>
    </form>
  );
}

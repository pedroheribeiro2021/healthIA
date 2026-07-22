"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const inputClass =
  "w-full rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800";
const labelClass = "text-sm font-medium";

export function NewRecipeForm() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [servings, setServings] = useState("1");
  const [instructions, setInstructions] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setFeedback(null);

    try {
      const response = await fetch("/api/v1/recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          servings: Number(servings),
          ...(instructions ? { instructions } : {}),
        }),
      });
      if (!response.ok) throw new Error("Falha ao criar");

      const recipe = (await response.json()) as { id: number };
      router.push(`/nutricao/receitas/${recipe.id}`);
      router.refresh();
    } catch {
      setFeedback("Não foi possível criar a receita. Tente novamente.");
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-md space-y-4 rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900"
    >
      <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
        Nova receita
      </p>

      <div className="space-y-1">
        <label htmlFor="name" className={labelClass}>
          Nome
        </label>
        <input
          id="name"
          type="text"
          required
          maxLength={200}
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={inputClass}
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="servings" className={labelClass}>
          Porções
        </label>
        <input
          id="servings"
          type="number"
          inputMode="decimal"
          step="1"
          min="1"
          max="100"
          required
          value={servings}
          onChange={(e) => setServings(e.target.value)}
          className={inputClass}
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="instructions" className={labelClass}>
          Modo de preparo (opcional)
        </label>
        <textarea
          id="instructions"
          rows={3}
          maxLength={5000}
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          className={inputClass}
        />
      </div>

      {feedback && <p className="text-sm text-red-600">{feedback}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900"
      >
        {submitting ? "Criando..." : "Criar e adicionar ingredientes"}
      </button>
    </form>
  );
}

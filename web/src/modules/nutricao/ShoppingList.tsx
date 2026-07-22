"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ShoppingListItem } from "@/domain/nutrition";

const inputClass =
  "w-full rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800";

function itemLabel(item: ShoppingListItem): string {
  return item.quantity !== null
    ? `${item.foodName} — ${item.quantity}${item.unit ?? ""}`
    : item.foodName;
}

// "Exportar texto p/ Google Keep" (docs/ROADMAP.md Fase 5) — sem
// integração com a API do Keep (fora do escopo desta fase, ver
// notas/Pendencias.md), só copia a lista formatada pra área de
// transferência; o Pedro cola onde quiser.
export function ShoppingList({ items }: { items: ShoppingListItem[] }) {
  const router = useRouter();
  const [foodName, setFoodName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(false);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await fetch("/api/v1/shopping-list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          foodName,
          ...(quantity ? { quantity: Number(quantity) } : {}),
          ...(unit ? { unit } : {}),
        }),
      });
      setFoodName("");
      setQuantity("");
      setUnit("");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleBought(id: number) {
    await fetch(`/api/v1/shopping-list/${id}/bought`, { method: "POST" });
    router.refresh();
  }

  async function handleCopy() {
    const text = items.map(itemLabel).join("\n");
    await navigator.clipboard.writeText(text);
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 2000);
  }

  return (
    <div className="w-full max-w-md space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-neutral-500">Lista de compras</p>
        {items.length > 0 && (
          <button
            type="button"
            onClick={handleCopy}
            className="text-xs font-medium text-neutral-500 underline"
          >
            {copyFeedback ? "Copiado!" : "Copiar lista"}
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-neutral-400">Nada na lista agora.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-center justify-between rounded-xl border border-neutral-200 bg-white p-3 text-sm dark:border-neutral-800 dark:bg-neutral-900"
            >
              <span>{itemLabel(item)}</span>
              <button
                type="button"
                onClick={() => handleBought(item.id)}
                className="rounded-md border border-neutral-300 px-2 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
              >
                Comprado
              </button>
            </li>
          ))}
        </ul>
      )}

      <form
        onSubmit={handleAdd}
        className="flex flex-wrap items-end gap-2 rounded-xl border border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-900"
      >
        <input
          type="text"
          placeholder="Item"
          required
          maxLength={200}
          value={foodName}
          onChange={(e) => setFoodName(e.target.value)}
          className={`${inputClass} flex-1`}
        />
        <input
          type="number"
          inputMode="decimal"
          placeholder="Qtd."
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          className={`${inputClass} w-20`}
        />
        <input
          type="text"
          placeholder="un."
          maxLength={30}
          value={unit}
          onChange={(e) => setUnit(e.target.value)}
          className={`${inputClass} w-16`}
        />
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900"
        >
          +
        </button>
      </form>
    </div>
  );
}

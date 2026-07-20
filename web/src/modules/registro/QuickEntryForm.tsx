"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ManualEntryType, MealType } from "@/domain/manualEntry";

const TYPE_LABELS: Record<ManualEntryType, string> = {
  weight: "Peso",
  hydration: "Hidratação",
  meal: "Refeição",
  note: "Nota",
};

const MEAL_TYPE_LABELS: Record<MealType, string> = {
  breakfast: "Café da manhã",
  lunch: "Almoço",
  dinner: "Jantar",
  snack: "Lanche",
  other: "Outro",
};

const inputClass =
  "w-full rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800";
const labelClass = "text-sm font-medium";

export function QuickEntryForm() {
  const router = useRouter();
  const [type, setType] = useState<ManualEntryType>("weight");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<
    { kind: "success" | "error"; message: string } | null
  >(null);

  const [kg, setKg] = useState("");
  const [liters, setLiters] = useState("");
  const [description, setDescription] = useState("");
  const [mealType, setMealType] = useState<MealType>("other");
  const [kcal, setKcal] = useState("");
  const [text, setText] = useState("");

  function resetFields() {
    setKg("");
    setLiters("");
    setDescription("");
    setMealType("other");
    setKcal("");
    setText("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setFeedback(null);

    const occurredAt = new Date().toISOString();
    const body =
      type === "weight"
        ? { type, occurredAt, kg: Number(kg) }
        : type === "hydration"
          ? { type, occurredAt, liters: Number(liters) }
          : type === "meal"
            ? {
                type,
                occurredAt,
                description,
                mealType,
                ...(kcal ? { kcal: Number(kcal) } : {}),
              }
            : { type, occurredAt, text };

    try {
      const response = await fetch("/api/v1/events/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error("Falha ao registrar");
      }

      resetFields();
      setFeedback({ kind: "success", message: "Registrado." });
      router.refresh();
    } catch {
      setFeedback({
        kind: "error",
        message: "Não foi possível registrar. Tente novamente.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-sm space-y-4 rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900"
    >
      <div className="flex gap-1 rounded-md bg-neutral-100 p-1 dark:bg-neutral-800">
        {(Object.keys(TYPE_LABELS) as ManualEntryType[]).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setType(option)}
            className={`flex-1 rounded px-2 py-1.5 text-xs font-medium ${
              type === option
                ? "bg-white text-neutral-900 shadow-sm dark:bg-neutral-950 dark:text-neutral-100"
                : "text-neutral-500"
            }`}
          >
            {TYPE_LABELS[option]}
          </button>
        ))}
      </div>

      {type === "weight" && (
        <div className="space-y-1">
          <label htmlFor="kg" className={labelClass}>
            Peso (kg)
          </label>
          <input
            id="kg"
            type="number"
            inputMode="decimal"
            step="0.1"
            min="20"
            max="400"
            required
            value={kg}
            onChange={(e) => setKg(e.target.value)}
            className={inputClass}
          />
        </div>
      )}

      {type === "hydration" && (
        <div className="space-y-1">
          <label htmlFor="liters" className={labelClass}>
            Água (litros)
          </label>
          <input
            id="liters"
            type="number"
            inputMode="decimal"
            step="0.1"
            min="0.1"
            max="10"
            required
            value={liters}
            onChange={(e) => setLiters(e.target.value)}
            className={inputClass}
          />
        </div>
      )}

      {type === "meal" && (
        <div className="space-y-3">
          <div className="space-y-1">
            <label htmlFor="description" className={labelClass}>
              O que comeu
            </label>
            <input
              id="description"
              type="text"
              required
              maxLength={200}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="mealType" className={labelClass}>
              Refeição
            </label>
            <select
              id="mealType"
              value={mealType}
              onChange={(e) => setMealType(e.target.value as MealType)}
              className={inputClass}
            >
              {(Object.keys(MEAL_TYPE_LABELS) as MealType[]).map((option) => (
                <option key={option} value={option}>
                  {MEAL_TYPE_LABELS[option]}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label htmlFor="kcal" className={labelClass}>
              Calorias (kcal, opcional)
            </label>
            <input
              id="kcal"
              type="number"
              inputMode="numeric"
              min="0"
              max="10000"
              value={kcal}
              onChange={(e) => setKcal(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>
      )}

      {type === "note" && (
        <div className="space-y-1">
          <label htmlFor="text" className={labelClass}>
            Nota
          </label>
          <textarea
            id="text"
            required
            rows={3}
            maxLength={2000}
            value={text}
            onChange={(e) => setText(e.target.value)}
            className={inputClass}
          />
        </div>
      )}

      {feedback && (
        <p
          className={`text-sm ${
            feedback.kind === "success" ? "text-emerald-600" : "text-red-600"
          }`}
        >
          {feedback.message}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900"
      >
        {submitting ? "Registrando..." : "Registrar"}
      </button>
    </form>
  );
}

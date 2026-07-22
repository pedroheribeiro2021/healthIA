"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { GOAL_METRIC_OPTIONS } from "@/engines/goals/goalMetrics";
import { goalInputUnitLabel, toSiTargetValue } from "./formatGoalValue";

const inputClass =
  "w-full rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800";
const labelClass = "text-sm font-medium";

export function NewGoalForm() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const [metricId, setMetricId] = useState(GOAL_METRIC_OPTIONS[0]?.id ?? "");
  const [targetValue, setTargetValue] = useState("");
  const [direction, setDirection] = useState<"increase" | "decrease" | "maintain">(
    "decrease",
  );
  const [deadline, setDeadline] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setFeedback(null);

    try {
      const response = await fetch("/api/v1/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          metricId,
          targetValue: toSiTargetValue(metricId, Number(targetValue)),
          direction,
          ...(deadline ? { deadline } : {}),
        }),
      });
      if (!response.ok) throw new Error("Falha ao criar");

      setTargetValue("");
      setDeadline("");
      router.refresh();
    } catch {
      setFeedback("Não foi possível criar a meta. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-md space-y-4 rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900"
    >
      <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
        Nova meta
      </p>

      <div className="space-y-1">
        <label htmlFor="metricId" className={labelClass}>
          Métrica
        </label>
        <select
          id="metricId"
          required
          value={metricId}
          onChange={(e) => setMetricId(e.target.value)}
          className={inputClass}
        >
          {GOAL_METRIC_OPTIONS.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label htmlFor="direction" className={labelClass}>
          Direção
        </label>
        <select
          id="direction"
          required
          value={direction}
          onChange={(e) =>
            setDirection(e.target.value as "increase" | "decrease" | "maintain")
          }
          className={inputClass}
        >
          <option value="decrease">Reduzir</option>
          <option value="increase">Aumentar</option>
          <option value="maintain">Manter</option>
        </select>
      </div>

      <div className="space-y-1">
        <label htmlFor="targetValue" className={labelClass}>
          Valor alvo ({goalInputUnitLabel(metricId)})
        </label>
        <input
          id="targetValue"
          type="number"
          inputMode="decimal"
          step="any"
          required
          value={targetValue}
          onChange={(e) => setTargetValue(e.target.value)}
          className={inputClass}
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="deadline" className={labelClass}>
          Prazo (opcional)
        </label>
        <input
          id="deadline"
          type="date"
          value={deadline}
          onChange={(e) => setDeadline(e.target.value)}
          className={inputClass}
        />
      </div>

      {feedback && <p className="text-sm text-red-600">{feedback}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900"
      >
        {submitting ? "Criando..." : "Criar meta"}
      </button>
    </form>
  );
}

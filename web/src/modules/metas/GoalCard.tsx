"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Goal } from "@/domain/goals";
import { GOAL_METRIC_DEFS } from "@/engines/goals/goalMetrics";
import {
  formatGoalValue,
  formatLocalDay,
  goalInputUnitLabel,
  toSiTargetValue,
} from "./formatGoalValue";

const DIRECTION_LABEL: Record<Goal["direction"], string> = {
  increase: "Aumentar",
  decrease: "Reduzir",
  maintain: "Manter",
};

const inputClass =
  "w-full rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800";
const labelClass = "text-sm font-medium";

export function GoalCard({
  goal,
  currentValue,
}: {
  goal: Goal;
  currentValue: number | null;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [editing, setEditing] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const [targetValue, setTargetValue] = useState(
    String(
      goal.metricId === "sleep.duration.avg7d"
        ? goal.targetValue / 3600
        : goal.targetValue,
    ),
  );
  const [direction, setDirection] = useState<Goal["direction"]>(goal.direction);
  const [deadline, setDeadline] = useState(goal.deadline ?? "");

  async function handleDeactivate() {
    setPending(true);
    await fetch(`/api/v1/goals/${goal.id}/deactivate`, { method: "POST" });
    router.refresh();
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setFeedback(null);
    try {
      const response = await fetch(`/api/v1/goals/${goal.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetValue: toSiTargetValue(goal.metricId, Number(targetValue)),
          direction,
          deadline: deadline || null,
        }),
      });
      if (!response.ok) throw new Error("Falha ao salvar");
      setEditing(false);
      router.refresh();
    } catch {
      setFeedback("Não foi possível salvar a meta. Tente novamente.");
    } finally {
      setPending(false);
    }
  }

  if (editing) {
    return (
      <form
        onSubmit={handleSave}
        className="w-full max-w-md space-y-3 rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900"
      >
        <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
          {GOAL_METRIC_DEFS[goal.metricId]?.label ?? goal.metricId}
        </p>

        <div className="space-y-1">
          <label htmlFor={`direction-${goal.id}`} className={labelClass}>
            Direção
          </label>
          <select
            id={`direction-${goal.id}`}
            value={direction}
            onChange={(e) => setDirection(e.target.value as Goal["direction"])}
            className={inputClass}
          >
            <option value="decrease">Reduzir</option>
            <option value="increase">Aumentar</option>
            <option value="maintain">Manter</option>
          </select>
        </div>

        <div className="space-y-1">
          <label htmlFor={`target-${goal.id}`} className={labelClass}>
            Valor alvo ({goalInputUnitLabel(goal.metricId)})
          </label>
          <input
            id={`target-${goal.id}`}
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
          <label htmlFor={`deadline-${goal.id}`} className={labelClass}>
            Prazo (opcional)
          </label>
          <input
            id={`deadline-${goal.id}`}
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            className={inputClass}
          />
        </div>

        {feedback && <p className="text-sm text-red-600">{feedback}</p>}

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={pending}
            className="flex-1 rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900"
          >
            {pending ? "Salvando..." : "Salvar"}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => setEditing(false)}
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-700 disabled:opacity-50 dark:border-neutral-700 dark:text-neutral-300"
          >
            Cancelar
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="w-full max-w-md rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-neutral-500">
            {DIRECTION_LABEL[goal.direction]} até{" "}
            {formatGoalValue(goal.metricId, goal.targetValue)}
          </p>
          <p className="mt-1 text-sm font-semibold text-neutral-900 dark:text-neutral-100">
            {GOAL_METRIC_DEFS[goal.metricId]?.label ?? goal.metricId}
          </p>
          <p className="mt-1 text-xs text-neutral-500">
            Atual:{" "}
            {currentValue !== null
              ? formatGoalValue(goal.metricId, currentValue)
              : "sem dado suficiente"}
            {goal.deadline ? ` · prazo ${formatLocalDay(goal.deadline)}` : ""}
          </p>
        </div>
        {goal.active && (
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={() => setEditing(true)}
              disabled={pending}
              className="rounded-md border border-neutral-300 px-2 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-100 disabled:opacity-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
            >
              Editar
            </button>
            <button
              type="button"
              onClick={handleDeactivate}
              disabled={pending}
              className="rounded-md border border-neutral-300 px-2 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-100 disabled:opacity-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
            >
              {pending ? "..." : "Desativar"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

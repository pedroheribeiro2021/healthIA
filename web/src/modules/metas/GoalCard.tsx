"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Goal } from "@/domain/goals";
import { GOAL_METRIC_DEFS } from "@/engines/goals/goalMetrics";
import { formatGoalValue, formatLocalDay } from "./formatGoalValue";

const DIRECTION_LABEL: Record<Goal["direction"], string> = {
  increase: "Aumentar",
  decrease: "Reduzir",
  maintain: "Manter",
};

export function GoalCard({
  goal,
  currentValue,
}: {
  goal: Goal;
  currentValue: number | null;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleDeactivate() {
    setPending(true);
    await fetch(`/api/v1/goals/${goal.id}/deactivate`, { method: "POST" });
    router.refresh();
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
          <button
            type="button"
            onClick={handleDeactivate}
            disabled={pending}
            className="shrink-0 rounded-md border border-neutral-300 px-2 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-100 disabled:opacity-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            {pending ? "..." : "Desativar"}
          </button>
        )}
      </div>
    </div>
  );
}

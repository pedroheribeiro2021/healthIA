import type { GoalWithProgress } from "@/engines/goals/goalService";
import { GoalCard } from "./GoalCard";

export function GoalList({ goals }: { goals: GoalWithProgress[] }) {
  if (goals.length === 0) {
    return (
      <div className="w-full max-w-md rounded-xl border border-dashed border-neutral-300 p-4 text-center text-sm text-neutral-500 dark:border-neutral-700">
        Nenhuma meta cadastrada ainda.
      </div>
    );
  }

  return (
    <div className="flex w-full max-w-md flex-col gap-3">
      {goals.map(({ goal, currentValue }) => (
        <GoalCard key={goal.id} goal={goal} currentValue={currentValue} />
      ))}
    </div>
  );
}

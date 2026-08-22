"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { HabitTodayState } from "@/domain/habits";
import { todayLocalDay } from "@/engines/analytics/period";

type HabitRow = HabitTodayState & { streak: number };

const SOURCE_LABEL: Record<HabitTodayState["source"], string> = {
  log: "",
  derived: "do relógio",
  none: "",
};

export function CheckinCard({ initialStates }: { initialStates: HabitRow[] }) {
  const router = useRouter();
  const [states, setStates] = useState(initialStates);
  const [pendingSlug, setPendingSlug] = useState<string | null>(null);

  const eligible = states.filter((s) => s.habit.priority !== "bonus");
  const doneCount = eligible.filter((s) => s.done).length;
  const adherencePct = eligible.length > 0 ? Math.round((doneCount / eligible.length) * 100) : null;

  async function toggleBoolean(row: HabitRow) {
    if (row.source === "derived") return;
    setPendingSlug(row.habit.slug);
    try {
      if (row.done) {
        await fetch(`/api/v1/habits/${row.habit.slug}/log`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ day: todayLocalDay() }),
        });
        setStates((prev) =>
          prev.map((s) => (s.habit.id === row.habit.id ? { ...s, done: false, quantity: null } : s)),
        );
      } else {
        await fetch(`/api/v1/habits/${row.habit.slug}/log`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ day: todayLocalDay(), done: true }),
        });
        setStates((prev) =>
          prev.map((s) => (s.habit.id === row.habit.id ? { ...s, done: true } : s)),
        );
      }
      router.refresh();
    } finally {
      setPendingSlug(null);
    }
  }

  async function stepQuantity(row: HabitRow, delta: number) {
    if (row.source === "derived") return;
    const next = Math.max(0, (row.quantity ?? 0) + delta);
    setPendingSlug(row.habit.slug);
    try {
      if (next === 0) {
        await fetch(`/api/v1/habits/${row.habit.slug}/log`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ day: todayLocalDay() }),
        });
        setStates((prev) =>
          prev.map((s) => (s.habit.id === row.habit.id ? { ...s, done: false, quantity: null } : s)),
        );
      } else {
        await fetch(`/api/v1/habits/${row.habit.slug}/log`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ day: todayLocalDay(), done: true, quantity: next }),
        });
        setStates((prev) =>
          prev.map((s) => (s.habit.id === row.habit.id ? { ...s, done: true, quantity: next } : s)),
        );
      }
      router.refresh();
    } finally {
      setPendingSlug(null);
    }
  }

  return (
    <section className="w-full max-w-md rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
          Rotina de hoje
        </h2>
        {adherencePct !== null && (
          <span className="text-xs font-medium text-neutral-500">{adherencePct}%</span>
        )}
      </div>

      {adherencePct !== null && (
        <div className="mb-4 h-1.5 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
          <div
            className="h-full rounded-full bg-emerald-500"
            style={{ width: `${adherencePct}%` }}
          />
        </div>
      )}

      {states.length === 0 && (
        <p className="text-sm text-neutral-500">Nenhum hábito configurado ainda.</p>
      )}

      <ul className="flex flex-col gap-2">
        {states.map((row) => (
          <li
            key={row.habit.slug}
            className="flex items-center justify-between gap-3 rounded-lg border border-neutral-100 px-3 py-2 dark:border-neutral-800"
          >
            <div className="flex flex-col">
              <span className="text-sm text-neutral-900 dark:text-neutral-100">
                {row.habit.name}
              </span>
              <span className="text-xs text-neutral-400">
                {row.source === "derived"
                  ? `${SOURCE_LABEL.derived}${row.quantity ? ` · ${row.quantity} registrado` : ""}`
                  : row.habit.sourceKind === "derived"
                    ? row.source === "log"
                      ? "marcado na mão · sem dado do relógio"
                      : "sem dado do relógio — toque para marcar"
                    : row.streak > 0
                      ? `${row.streak} dias seguidos`
                      : ""}
              </span>
            </div>

            {row.habit.kind === "quantity" && row.source !== "derived" ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={pendingSlug === row.habit.slug}
                  onClick={() => stepQuantity(row, -1)}
                  className="h-11 w-11 shrink-0 rounded-full border border-neutral-300 text-lg text-neutral-700 disabled:opacity-50 dark:border-neutral-700 dark:text-neutral-300"
                >
                  −
                </button>
                <span className="w-6 text-center text-sm font-medium text-neutral-900 dark:text-neutral-100">
                  {row.quantity ?? 0}
                </span>
                <button
                  type="button"
                  disabled={pendingSlug === row.habit.slug}
                  onClick={() => stepQuantity(row, 1)}
                  className="h-11 w-11 shrink-0 rounded-full border border-neutral-300 text-lg text-neutral-700 disabled:opacity-50 dark:border-neutral-700 dark:text-neutral-300"
                >
                  +
                </button>
              </div>
            ) : (
              <button
                type="button"
                disabled={row.source === "derived" || pendingSlug === row.habit.slug}
                onClick={() => toggleBoolean(row)}
                aria-pressed={row.done}
                className={`h-11 w-11 shrink-0 rounded-full border text-lg disabled:opacity-60 ${
                  row.done
                    ? "border-emerald-500 bg-emerald-500 text-white"
                    : "border-neutral-300 text-neutral-400 dark:border-neutral-700"
                }`}
              >
                {row.done ? "✓" : ""}
              </button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

"use client";

import { Fragment, useState } from "react";
import { useRouter } from "next/navigation";
import type { HabitWeekDay, HabitWeekEntry } from "@/domain/habits";
import { todayLocalDay } from "@/engines/analytics/period";

const WEEKDAY_LABELS = ["S", "T", "Q", "Q", "S", "S", "D"];

// Grade 7 dias × hábito com o alvo semanal e quanto falta
// (docs/FASE-7-ROTINA.md, 1.7). Hábitos manuais (source_kind !== 'derived')
// podem ser marcados/desmarcados em qualquer dia já passado — o
// CheckinCard só cobre hoje; sem isso, esquecer de marcar um dia
// significava perder aquele dia pra sempre, mesmo a API já aceitando
// { day } em POST/DELETE /api/v1/habits/{slug}/log.
export function WeekGrid({ entries: initialEntries }: { entries: HabitWeekEntry[] }) {
  const router = useRouter();
  const [entries, setEntries] = useState(initialEntries);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const today = todayLocalDay();

  // completedThisWeek/streak são calculados no servidor (habitService), não
  // aqui — o toggle só espelha o "done" do dia otimisticamente; o resto só
  // fica correto quando router.refresh() traz `entries` novo. Ajuste de
  // estado durante o render (não em useEffect) é o padrão recomendado do
  // React pra "resetar estado quando uma prop muda".
  const [prevInitialEntries, setPrevInitialEntries] = useState(initialEntries);
  if (initialEntries !== prevInitialEntries) {
    setPrevInitialEntries(initialEntries);
    setEntries(initialEntries);
  }

  async function toggleDay(entry: HabitWeekEntry, day: HabitWeekDay) {
    if (entry.habit.sourceKind === "derived" || day.day > today) return;
    const key = `${entry.habit.slug}:${day.day}`;
    setPendingKey(key);
    try {
      if (day.done) {
        await fetch(`/api/v1/habits/${entry.habit.slug}/log`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ day: day.day }),
        });
      } else {
        await fetch(`/api/v1/habits/${entry.habit.slug}/log`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            day: day.day,
            done: true,
            ...(entry.habit.kind === "quantity"
              ? { quantity: entry.habit.targetPerDay ?? 1 }
              : {}),
          }),
        });
      }
      setEntries((prev) =>
        prev.map((e) =>
          e.habit.id === entry.habit.id
            ? {
                ...e,
                days: e.days.map((d) =>
                  d.day === day.day ? { ...d, done: !d.done } : d,
                ),
              }
            : e,
        ),
      );
      router.refresh();
    } finally {
      setPendingKey(null);
    }
  }

  if (entries.length === 0) {
    return (
      <p className="text-sm text-neutral-500">Nenhum hábito configurado ainda.</p>
    );
  }

  return (
    <div className="flex w-full flex-col gap-3">
      <div className="grid grid-cols-[1fr_repeat(7,1.5rem)] items-center gap-x-1 gap-y-2 text-xs">
        <span />
        {WEEKDAY_LABELS.map((label, i) => (
          <span key={i} className="text-center text-neutral-400">
            {label}
          </span>
        ))}

        {entries.map((entry) => {
          const remaining = Math.max(0, entry.habit.targetPerWeek - entry.completedThisWeek);
          return (
            <Fragment key={entry.habit.slug}>
              <div className="flex flex-col pr-2">
                <span className="text-sm text-neutral-900 dark:text-neutral-100">
                  {entry.habit.name}
                </span>
                <span className="text-[11px] text-neutral-400">
                  {entry.completedThisWeek} de {entry.habit.targetPerWeek}
                  {remaining > 0 ? ` · faltam ${remaining}` : " · meta batida"}
                </span>
              </div>
              {entry.days.map((day) => {
                const interactive =
                  entry.habit.sourceKind !== "derived" && day.day <= today;
                const key = `${entry.habit.slug}:${day.day}`;
                return (
                  <button
                    key={day.day}
                    type="button"
                    disabled={!interactive || pendingKey === key}
                    onClick={() => toggleDay(entry, day)}
                    aria-pressed={day.done}
                    aria-label={`${entry.habit.name} em ${day.day}`}
                    className={`mx-auto flex h-6 w-6 items-center justify-center rounded-full text-[11px] disabled:opacity-50 ${
                      day.done
                        ? "bg-emerald-500 text-white"
                        : "bg-neutral-100 text-neutral-300 dark:bg-neutral-800"
                    } ${interactive ? "cursor-pointer" : "cursor-default"}`}
                  >
                    {day.done ? "✓" : ""}
                  </button>
                );
              })}
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}

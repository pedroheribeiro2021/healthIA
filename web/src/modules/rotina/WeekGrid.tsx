import { Fragment } from "react";
import type { HabitWeekEntry } from "@/domain/habits";

const WEEKDAY_LABELS = ["S", "T", "Q", "Q", "S", "S", "D"];

// Grade 7 dias × hábito com o alvo semanal e quanto falta
// (docs/FASE-7-ROTINA.md, 1.7) — server component, só apresenta o que
// engines/habits/habitService.ts já calculou.
export function WeekGrid({ entries }: { entries: HabitWeekEntry[] }) {
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
              {entry.days.map((day) => (
                <span
                  key={day.day}
                  className={`mx-auto flex h-6 w-6 items-center justify-center rounded-full text-[11px] ${
                    day.done
                      ? "bg-emerald-500 text-white"
                      : "bg-neutral-100 text-neutral-300 dark:bg-neutral-800"
                  }`}
                >
                  {day.done ? "✓" : ""}
                </span>
              ))}
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}

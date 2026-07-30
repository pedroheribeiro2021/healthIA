import type { LocalDay, Period } from "@/domain/analytics";
import type {
  Habit,
  HabitTodayState,
  HabitWeekDay,
  HabitWeekEntry,
} from "@/domain/habits";
import type { EventRepository, HabitRepository } from "@/domain/repositories";
import { addDays, lastNDays, localDayBounds } from "@/engines/analytics/period";
import { isDerivedHabitSlug, resolveDerivedHabit } from "./derivedHabits";
import { computeStreak, countDoneInDays } from "./habitStats";

// Eventos que algum hábito derivado consulta (docs/FASE-7-ROTINA.md, 1.1) —
// workout (musculacao), hydration (agua), sleep_session (dormir_cedo).
async function fetchDerivedEvents(
  eventRepo: EventRepository,
  from: string,
  to: string,
) {
  const [workouts, hydration, sleep] = await Promise.all([
    eventRepo.listHealthEvents({ eventType: "workout", from, to }),
    eventRepo.listHealthEvents({ eventType: "hydration", from, to }),
    eventRepo.listHealthEvents({ eventType: "sleep_session", from, to }),
  ]);
  return [...workouts, ...hydration, ...sleep];
}

function isDerived(habit: Habit): boolean {
  return habit.sourceKind === "derived" && isDerivedHabitSlug(habit.slug);
}

export async function getTodayHabitStates(
  habitRepo: HabitRepository,
  eventRepo: EventRepository,
  day: LocalDay,
): Promise<HabitTodayState[]> {
  const period = localDayBounds(day);
  // Cobre sono que começou na véspera (dormir_cedo é atribuído ao dia em
  // que a pessoa acordou — mesma convenção de sleep.ts).
  const windowStart = localDayBounds(addDays(day, -1)).start;

  const [habits, todayLogs, events] = await Promise.all([
    habitRepo.listActiveHabits(),
    habitRepo.listLogs({ from: day, to: day }),
    fetchDerivedEvents(eventRepo, windowStart, period.end),
  ]);

  return habits.map((habit) => {
    if (isDerived(habit)) {
      const derived = resolveDerivedHabit(
        habit.slug,
        day,
        period,
        events,
        habit.targetPerDay,
      );
      return {
        habit,
        done: derived?.done ?? false,
        quantity: derived?.quantity ?? null,
        source: derived ? "derived" : "none",
      };
    }
    const log = todayLogs.find((l) => l.habitId === habit.id);
    return {
      habit,
      done: log?.done ?? false,
      quantity: log?.quantity ?? null,
      source: log ? "log" : "none",
    };
  });
}

// Rejeita registrar hábito derived pela rota manual (409, docs/FASE-7-ROTINA.md
// 1.6) — decisão de negócio, vive aqui, não na rota.
export function assertLoggable(habit: Habit): void {
  if (habit.sourceKind === "derived") {
    throw new HabitNotLoggableError(habit);
  }
}

export class HabitNotLoggableError extends Error {
  constructor(public habit: Habit) {
    super(
      `hábito "${habit.slug}" é derivado — registre pelo caminho normal do dado de origem, não por habit_logs`,
    );
  }
}

const STREAK_LOOKBACK_DAYS = 30;

export async function getHabitWeek(
  habitRepo: HabitRepository,
  eventRepo: EventRepository,
  day: LocalDay,
): Promise<HabitWeekEntry[]> {
  const days7 = lastNDays(day, 7);
  const derivedWindow: Period = {
    start: localDayBounds(addDays(days7[0], -1)).start,
    end: localDayBounds(day).end,
  };

  const [habits, logs, events] = await Promise.all([
    habitRepo.listActiveHabits(),
    habitRepo.listLogs({ from: addDays(day, -STREAK_LOOKBACK_DAYS), to: day }),
    fetchDerivedEvents(eventRepo, derivedWindow.start, derivedWindow.end),
  ]);

  return habits.map((habit) => {
    const derived = isDerived(habit);
    const logsForHabit = logs.filter((l) => l.habitId === habit.id);

    const days: HabitWeekDay[] = days7.map((d) => {
      if (derived) {
        const result = resolveDerivedHabit(
          habit.slug,
          d,
          localDayBounds(d),
          events,
          habit.targetPerDay,
        );
        return { day: d, done: result?.done ?? false, quantity: result?.quantity ?? null };
      }
      const log = logsForHabit.find((l) => l.day === d);
      return { day: d, done: log?.done ?? false, quantity: log?.quantity ?? null };
    });

    // Streak de hábito derivado só enxerga os 7 dias exibidos aqui (não
    // reprocessa 30 dias de health_events pra essa consulta) — trade-off
    // aceitável no v1; streak de hábito manual usa o histórico completo
    // buscado acima (STREAK_LOOKBACK_DAYS).
    const streak = computeStreak(derived ? days : logsForHabit, day);
    const completedThisWeek = countDoneInDays(derived ? days : logsForHabit, days7);

    return { habit, days, streak, completedThisWeek };
  });
}

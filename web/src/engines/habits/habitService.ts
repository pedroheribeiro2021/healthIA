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
    const derived = isDerived(habit)
      ? resolveDerivedHabit(habit.slug, day, period, events, habit.targetPerDay)
      : null;
    if (derived) {
      return { habit, done: derived.done, quantity: derived.quantity, source: "derived" as const };
    }
    // Sem dado do relógio hoje (ou hábito não-derivado): habit_logs manda,
    // inclusive pra hábito `derived` — fallback pro Pedro poder marcar na
    // mão quando o sync ainda não trouxe o dado do dia (docs/FASE-7-ROTINA.md
    // não previa isso, mas bloquear o toque enquanto o sync está fora do ar
    // deixa o hábito preso pra sempre). Assim que o relógio sincronizar,
    // `derived` volta a mandar e o log manual vira redundante, não conflito.
    const log = todayLogs.find((l) => l.habitId === habit.id);
    return {
      habit,
      done: log?.done ?? false,
      quantity: log?.quantity ?? null,
      source: log ? "log" : ("none" as const),
    };
  });
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
      const result = derived
        ? resolveDerivedHabit(habit.slug, d, localDayBounds(d), events, habit.targetPerDay)
        : null;
      if (result) {
        return { day: d, done: result.done, quantity: result.quantity, source: "derived" as const };
      }
      // Fallback manual — mesma lógica de getTodayHabitStates: sem dado do
      // relógio nesse dia, habit_logs manda.
      const log = logsForHabit.find((l) => l.day === d);
      return {
        day: d,
        done: log?.done ?? false,
        quantity: log?.quantity ?? null,
        source: log ? "log" : ("none" as const),
      };
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

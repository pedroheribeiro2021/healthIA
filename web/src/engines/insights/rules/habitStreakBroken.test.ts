import { describe, expect, it } from "vitest";
import type { Habit, HabitLog } from "@/domain/habits";
import type { MetricStore } from "../types";
import { habitStreakBroken } from "./habitStreakBroken";

const DAY = "2026-07-21";

function baseStore(overrides: Partial<MetricStore> = {}): MetricStore {
  return {
    day: DAY,
    todaySummary: null,
    recentDailySummaries: [],
    latestMetrics: {},
    metricSeries: {},
    correlations: [],
    recentWorkouts: [],
    recentLabResults: [],
    activeGoals: [],
    habits: [],
    recentHabitLogs: [],
    ...overrides,
  };
}

function habit(overrides: Partial<Habit> = {}): Habit {
  return {
    id: 1,
    slug: "creatina",
    name: "Creatina",
    category: "suplementacao",
    kind: "boolean",
    unit: null,
    targetPerDay: null,
    targetPerWeek: 7,
    sourceKind: "manual_log",
    priority: "core",
    sortOrder: 0,
    active: true,
    createdAt: "2026-07-01T00:00:00.000Z",
    ...overrides,
  };
}

function log(habitId: number, day: string, done = true): HabitLog {
  return { id: 1, habitId, day, done, quantity: null, note: null, loggedAt: `${day}T12:00:00.000Z` };
}

describe("habitStreakBroken", () => {
  it("dispara quando streak >= 7 até ontem e hoje não foi marcado", () => {
    const h = habit();
    const logs = ["2026-07-14", "2026-07-15", "2026-07-16", "2026-07-17", "2026-07-18", "2026-07-19", "2026-07-20"].map(
      (d) => log(h.id, d),
    );
    const store = baseStore({ habits: [h], recentHabitLogs: logs });
    const result = habitStreakBroken.evaluate(store);
    expect(result?.ruleId).toBe("habit_streak_broken");
    expect(result?.evidence).toMatchObject({ habit: "Creatina", streak: 7 });
  });

  it("não dispara quando o hábito foi marcado hoje", () => {
    const h = habit();
    const logs = ["2026-07-14", "2026-07-15", "2026-07-16", "2026-07-17", "2026-07-18", "2026-07-19", "2026-07-20", DAY].map(
      (d) => log(h.id, d),
    );
    const store = baseStore({ habits: [h], recentHabitLogs: logs });
    expect(habitStreakBroken.evaluate(store)).toBeNull();
  });

  it("não dispara quando a streak quebrada era menor que 7", () => {
    const h = habit();
    const logs = ["2026-07-18", "2026-07-19", "2026-07-20"].map((d) => log(h.id, d));
    const store = baseStore({ habits: [h], recentHabitLogs: logs });
    expect(habitStreakBroken.evaluate(store)).toBeNull();
  });

  it("ignora hábitos priority='bonus'", () => {
    const h = habit({ priority: "bonus" });
    const logs = ["2026-07-14", "2026-07-15", "2026-07-16", "2026-07-17", "2026-07-18", "2026-07-19", "2026-07-20"].map(
      (d) => log(h.id, d),
    );
    const store = baseStore({ habits: [h], recentHabitLogs: logs });
    expect(habitStreakBroken.evaluate(store)).toBeNull();
  });
});

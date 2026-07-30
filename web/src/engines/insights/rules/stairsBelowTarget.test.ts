import { describe, expect, it } from "vitest";
import type { Habit, HabitLog } from "@/domain/habits";
import type { MetricStore } from "../types";
import { stairsBelowTarget } from "./stairsBelowTarget";

// 2026-07-21 é terça-feira da semana de 20/07 (segunda) a 26/07 (domingo);
// a "semana fechada" anterior é 13/07 (segunda) a 19/07 (domingo).
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

function escadas(overrides: Partial<Habit> = {}): Habit {
  return {
    id: 1,
    slug: "escadas",
    name: "Escadas",
    category: "treino",
    kind: "quantity",
    unit: "subidas",
    targetPerDay: 5,
    targetPerWeek: 3,
    sourceKind: "manual_log",
    priority: "core",
    sortOrder: 0,
    active: true,
    createdAt: "2026-07-01T00:00:00.000Z",
    ...overrides,
  };
}

function log(habitId: number, day: string): HabitLog {
  return { id: 1, habitId, day, done: true, quantity: 5, note: null, loggedAt: `${day}T12:00:00.000Z` };
}

describe("stairsBelowTarget", () => {
  it("não dispara sem o hábito escadas configurado", () => {
    expect(stairsBelowTarget.evaluate(baseStore())).toBeNull();
  });

  it("dispara quando a semana fechada ficou abaixo da meta", () => {
    const h = escadas();
    const logs = [log(h.id, "2026-07-14"), log(h.id, "2026-07-16")]; // 2 de 3
    const store = baseStore({ habits: [h], recentHabitLogs: logs });
    const result = stairsBelowTarget.evaluate(store);
    expect(result?.ruleId).toBe("stairs_below_target");
    expect(result?.evidence).toMatchObject({ completed: 2, target: 3 });
  });

  it("não dispara quando a meta da semana fechada foi batida", () => {
    const h = escadas();
    const logs = [
      log(h.id, "2026-07-14"),
      log(h.id, "2026-07-16"),
      log(h.id, "2026-07-18"),
    ];
    const store = baseStore({ habits: [h], recentHabitLogs: logs });
    expect(stairsBelowTarget.evaluate(store)).toBeNull();
  });

  it("ignora logs da semana atual (ainda em andamento)", () => {
    const h = escadas();
    // Nenhum log na semana fechada, só na semana atual (20 e 21/07) -> conta 0
    const logs = [log(h.id, "2026-07-20"), log(h.id, DAY)];
    const store = baseStore({ habits: [h], recentHabitLogs: logs });
    const result = stairsBelowTarget.evaluate(store);
    expect(result?.evidence).toMatchObject({ completed: 0 });
  });
});

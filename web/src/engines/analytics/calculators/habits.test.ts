import { describe, expect, it } from "vitest";
import type { Habit } from "@/domain/habits";
import { localDayBounds } from "@/engines/analytics/period";
import { computeHabitAdherenceDaily } from "./habits";

const PERIOD = localDayBounds("2026-07-20");

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

describe("computeHabitAdherenceDaily", () => {
  it("retorna null quando não há nenhum hábito elegível", () => {
    const result = computeHabitAdherenceDaily([], PERIOD);
    expect(result.value).toBeNull();
    expect(result.detail).toEqual({ reason: "no_habits" });
  });

  it("calcula % de hábitos core cumpridos", () => {
    const statuses = [
      { habit: habit({ slug: "creatina" }), done: true },
      { habit: habit({ slug: "fruta" }), done: true },
      { habit: habit({ slug: "sem_ifood" }), done: false },
      { habit: habit({ slug: "agua" }), done: true },
    ];
    const result = computeHabitAdherenceDaily(statuses, PERIOD);
    expect(result.value).toBe(75);
    expect(result.detail).toMatchObject({ doneCount: 3, total: 4 });
  });

  it("exclui hábitos priority='bonus' do denominador", () => {
    const statuses = [
      { habit: habit({ slug: "creatina", priority: "core" }), done: true },
      { habit: habit({ slug: "cardio", priority: "bonus" }), done: false },
    ];
    const result = computeHabitAdherenceDaily(statuses, PERIOD);
    expect(result.value).toBe(100);
    expect(result.detail).toMatchObject({ doneCount: 1, total: 1 });
  });

  it("100% quando bonus é o único não cumprido e todos os core estão ok", () => {
    const statuses = [
      { habit: habit({ slug: "creatina" }), done: true },
      { habit: habit({ slug: "cardio", priority: "bonus" }), done: true },
    ];
    const result = computeHabitAdherenceDaily(statuses, PERIOD);
    expect(result.value).toBe(100);
  });
});

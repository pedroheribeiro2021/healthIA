import { describe, expect, it } from "vitest";
import type { DailySummary } from "@/domain/analytics";
import type { Goal } from "@/domain/goals";
import {
  currentValueForGoal,
  isValidGoalMetricId,
} from "./goalMetrics";

function summary(day: string, overrides: Partial<DailySummary> = {}): DailySummary {
  return {
    day,
    sleepDurationS: null,
    sleepScore: null,
    restingHr: null,
    hrvRmssd: null,
    steps: null,
    workouts: null,
    trainingLoad: null,
    kcalIn: null,
    proteinG: null,
    waterL: null,
    weightKg: null,
    recoveryScore: null,
    computedAt: `${day}T12:00:00.000Z`,
    ...overrides,
  };
}

function goal(overrides: Partial<Goal> = {}): Goal {
  return {
    id: 1,
    metricId: "body.weight.avg7d",
    targetValue: 78,
    direction: "decrease",
    deadline: null,
    active: true,
    createdAt: "2026-07-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("isValidGoalMetricId", () => {
  it("aceita métricas curadas", () => {
    expect(isValidGoalMetricId("body.weight.avg7d")).toBe(true);
    expect(isValidGoalMetricId("nutrition.protein.avg7d")).toBe(true);
  });

  it("rejeita métricas fora da lista curada (ex.: não fazem sentido como meta)", () => {
    expect(isValidGoalMetricId("training.load.acwr")).toBe(false);
    expect(isValidGoalMetricId("qualquer.coisa")).toBe(false);
  });
});

describe("currentValueForGoal", () => {
  it("calcula média dos últimos 7 dias pra métrica avg7d", () => {
    const summaries = [
      summary("2026-07-14", { weightKg: 80 }),
      summary("2026-07-15", { weightKg: 79 }),
      summary("2026-07-16", { weightKg: 79 }),
      summary("2026-07-17", { weightKg: 78 }),
      summary("2026-07-18", { weightKg: 78 }),
      summary("2026-07-19", { weightKg: 77 }),
      summary("2026-07-20", { weightKg: 77 }),
    ];

    const value = currentValueForGoal(goal({ metricId: "body.weight.avg7d" }), summaries);
    expect(value).toBeCloseTo(78.28571, 4);
  });

  it("ignora dias sem dado (null) na média avg7d", () => {
    const summaries = [
      summary("2026-07-19", { proteinG: null }),
      summary("2026-07-20", { proteinG: 150 }),
    ];

    const value = currentValueForGoal(
      goal({ metricId: "nutrition.protein.avg7d" }),
      summaries,
    );
    expect(value).toBe(150);
  });

  it("usa o valor mais recente não-nulo pra métrica latest", () => {
    const summaries = [
      summary("2026-07-19", { recoveryScore: 70 }),
      summary("2026-07-20", { recoveryScore: null }),
    ];

    const value = currentValueForGoal(
      goal({ metricId: "recovery.score.daily" }),
      summaries,
    );
    expect(value).toBe(70);
  });

  it("retorna null quando não há nenhum dado no período", () => {
    const summaries = [summary("2026-07-20", { weightKg: null })];

    const value = currentValueForGoal(goal({ metricId: "body.weight.avg7d" }), summaries);
    expect(value).toBeNull();
  });

  it("retorna null pra metric_id não suportado (fallback seguro)", () => {
    const value = currentValueForGoal(
      goal({ metricId: "training.load.acwr" }),
      [summary("2026-07-20")],
    );
    expect(value).toBeNull();
  });
});

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
    habitAdherencePct: null,
    bodyFatPct: null,
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

  it("soma (não tira média) pra métrica sum7d (training.sessions.7d)", () => {
    const summaries = [
      summary("2026-07-14", { workouts: 1 }),
      summary("2026-07-15", { workouts: 0 }),
      summary("2026-07-16", { workouts: 1 }),
      summary("2026-07-17", { workouts: 0 }),
      summary("2026-07-18", { workouts: 1 }),
      summary("2026-07-19", { workouts: 0 }),
      summary("2026-07-20", { workouts: 1 }),
    ];
    const value = currentValueForGoal(
      goal({ metricId: "training.sessions.7d" }),
      summaries,
    );
    expect(value).toBe(4);
  });

  it("aceita habit.adherence.avg7d e body.fatpct.avg7d (Fase 7)", () => {
    expect(isValidGoalMetricId("habit.adherence.avg7d")).toBe(true);
    expect(isValidGoalMetricId("body.fatpct.avg7d")).toBe(true);

    const summaries = [
      summary("2026-07-19", { habitAdherencePct: 80, bodyFatPct: 22 }),
      summary("2026-07-20", { habitAdherencePct: 90, bodyFatPct: 21.5 }),
    ];
    expect(
      currentValueForGoal(goal({ metricId: "habit.adherence.avg7d" }), summaries),
    ).toBe(85);
    expect(
      currentValueForGoal(goal({ metricId: "body.fatpct.avg7d" }), summaries),
    ).toBeCloseTo(21.75, 4);
  });
});

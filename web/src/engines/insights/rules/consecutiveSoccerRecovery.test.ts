import { describe, expect, it } from "vitest";
import type { HealthEvent } from "@/domain/healthEvent";
import type { MetricStore } from "../types";
import { consecutiveSoccerRecovery } from "./consecutiveSoccerRecovery";

function soccerWorkout(startTime: string): HealthEvent {
  return {
    id: 1,
    eventType: "workout",
    startTime,
    endTime: null,
    value: 3600,
    unit: "s",
    detail: { sport: "soccer" },
    source: "health_connect",
    rawRecordId: 1,
    supersededBy: null,
    createdAt: startTime,
  };
}

function baseStore(overrides: Partial<MetricStore> = {}): MetricStore {
  return {
    day: "2026-07-21",
    todaySummary: null,
    recentDailySummaries: [],
    latestMetrics: {},
    metricSeries: {},
    correlations: [],
    recentWorkouts: [],
    recentLabResults: [],
    activeGoals: [],
    ...overrides,
  };
}

describe("consecutiveSoccerRecovery", () => {
  it("dispara com futebol nos 2 dias anteriores + recovery baixo hoje", () => {
    const store = baseStore({
      todaySummary: { day: "2026-07-21", sleepDurationS: null, sleepScore: null, restingHr: null, hrvRmssd: null, steps: null, workouts: null, trainingLoad: null, kcalIn: null, proteinG: null, waterL: null, weightKg: null, recoveryScore: 45, computedAt: "" },
      recentWorkouts: [
        soccerWorkout("2026-07-19T20:00:00-03:00"),
        soccerWorkout("2026-07-20T20:00:00-03:00"),
      ],
    });

    const insight = consecutiveSoccerRecovery.evaluate(store);
    expect(insight?.ruleId).toBe("consecutive_soccer_recovery");
  });

  it("não dispara se recovery está ok", () => {
    const store = baseStore({
      todaySummary: { day: "2026-07-21", sleepDurationS: null, sleepScore: null, restingHr: null, hrvRmssd: null, steps: null, workouts: null, trainingLoad: null, kcalIn: null, proteinG: null, waterL: null, weightKg: null, recoveryScore: 80, computedAt: "" },
      recentWorkouts: [
        soccerWorkout("2026-07-19T20:00:00-03:00"),
        soccerWorkout("2026-07-20T20:00:00-03:00"),
      ],
    });
    expect(consecutiveSoccerRecovery.evaluate(store)).toBeNull();
  });

  it("não dispara com futebol em só 1 dos 2 dias", () => {
    const store = baseStore({
      todaySummary: { day: "2026-07-21", sleepDurationS: null, sleepScore: null, restingHr: null, hrvRmssd: null, steps: null, workouts: null, trainingLoad: null, kcalIn: null, proteinG: null, waterL: null, weightKg: null, recoveryScore: 45, computedAt: "" },
      recentWorkouts: [soccerWorkout("2026-07-20T20:00:00-03:00")],
    });
    expect(consecutiveSoccerRecovery.evaluate(store)).toBeNull();
  });

  it("não dispara sem daily_summary do dia", () => {
    expect(consecutiveSoccerRecovery.evaluate(baseStore())).toBeNull();
  });
});

import { describe, expect, it } from "vitest";
import type { DailySummary, TimeSeries } from "@/domain/analytics";
import type { MetricStore } from "../types";
import { weightPlateauLowAdherence } from "./weightPlateauLowAdherence";

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
    habits: [],
    recentHabitLogs: [],
    ...overrides,
  };
}

function flatSeries(n = 21, value = 78): TimeSeries {
  return Array.from({ length: n }, (_, i) => ({
    day: `2026-06-${String((i % 28) + 1).padStart(2, "0")}`,
    value,
  }));
}

function risingSeries(n = 21): TimeSeries {
  return Array.from({ length: n }, (_, i) => ({
    day: `2026-06-${String((i % 28) + 1).padStart(2, "0")}`,
    value: 70 + i * 0.5,
  }));
}

function summary(habitAdherencePct: number | null): DailySummary {
  return {
    day: "2026-07-21",
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
    habitAdherencePct,
    bodyFatPct: null,
    computedAt: "2026-07-21T12:00:00.000Z",
  };
}

describe("weightPlateauLowAdherence", () => {
  it("dispara com peso parado e adesão baixa", () => {
    const store = baseStore({
      metricSeries: { "body.weight.avg7d": flatSeries() },
      recentDailySummaries: Array.from({ length: 7 }, () => summary(50)),
    });
    const result = weightPlateauLowAdherence.evaluate(store);
    expect(result?.ruleId).toBe("weight_plateau_low_adherence");
  });

  it("não dispara sem série de peso", () => {
    expect(weightPlateauLowAdherence.evaluate(baseStore())).toBeNull();
  });

  it("não dispara quando o peso está em tendência (não é platô)", () => {
    const store = baseStore({
      metricSeries: { "body.weight.avg7d": risingSeries() },
      recentDailySummaries: Array.from({ length: 7 }, () => summary(50)),
    });
    expect(weightPlateauLowAdherence.evaluate(store)).toBeNull();
  });

  it("não dispara quando o peso está parado mas a adesão está boa", () => {
    const store = baseStore({
      metricSeries: { "body.weight.avg7d": flatSeries() },
      recentDailySummaries: Array.from({ length: 7 }, () => summary(85)),
    });
    expect(weightPlateauLowAdherence.evaluate(store)).toBeNull();
  });

  it("não dispara sem dado de adesão", () => {
    const store = baseStore({
      metricSeries: { "body.weight.avg7d": flatSeries() },
    });
    expect(weightPlateauLowAdherence.evaluate(store)).toBeNull();
  });
});

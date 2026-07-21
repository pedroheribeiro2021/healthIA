import { describe, expect, it } from "vitest";
import type { DailySummary } from "@/domain/analytics";
import type { Goal } from "@/domain/goals";
import type { MetricStore } from "../types";
import { proteinBelowTarget } from "./proteinBelowTarget";

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

function summaryWithProtein(day: string, proteinG: number | null): DailySummary {
  return {
    day, sleepDurationS: null, sleepScore: null, restingHr: null, hrvRmssd: null,
    steps: null, workouts: null, trainingLoad: null, kcalIn: null, proteinG,
    waterL: null, weightKg: null, recoveryScore: null, computedAt: "",
  };
}

const proteinGoal: Goal = {
  id: 1, metricId: "nutrition.protein.avg7d", targetValue: 120,
  direction: "increase", deadline: null, active: true, createdAt: "",
};

describe("proteinBelowTarget", () => {
  it("dispara quando a média 7d está abaixo da meta", () => {
    const store = baseStore({
      activeGoals: [proteinGoal],
      recentDailySummaries: [80, 90, 85, 95].map((p, i) => summaryWithProtein(`d${i}`, p)),
    });
    expect(proteinBelowTarget.evaluate(store)?.ruleId).toBe("protein_below_target");
  });

  it("não dispara sem meta ativa (caso real hoje: nutrição ainda não rastreada)", () => {
    const store = baseStore({
      recentDailySummaries: [80, 90, 85, 95].map((p, i) => summaryWithProtein(`d${i}`, p)),
    });
    expect(proteinBelowTarget.evaluate(store)).toBeNull();
  });

  it("não dispara com poucos dias de dado", () => {
    const store = baseStore({
      activeGoals: [proteinGoal],
      recentDailySummaries: [summaryWithProtein("d0", 80)],
    });
    expect(proteinBelowTarget.evaluate(store)).toBeNull();
  });

  it("não dispara quando a média já atinge a meta", () => {
    const store = baseStore({
      activeGoals: [proteinGoal],
      recentDailySummaries: [130, 140, 125, 150].map((p, i) => summaryWithProtein(`d${i}`, p)),
    });
    expect(proteinBelowTarget.evaluate(store)).toBeNull();
  });
});

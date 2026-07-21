import { describe, expect, it } from "vitest";
import type { TimeSeries } from "@/domain/analytics";
import type { Goal } from "@/domain/goals";
import type { MetricStore } from "../types";
import { weightTrendVsGoal } from "./weightTrendVsGoal";

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

function goal(direction: Goal["direction"]): Goal {
  return {
    id: 1,
    metricId: "body.weight.avg7d",
    targetValue: 80,
    direction,
    deadline: null,
    active: true,
    createdAt: "",
  };
}

function risingSeries(): TimeSeries {
  return Array.from({ length: 14 }, (_, i) => ({
    day: `2026-07-${String(i + 1).padStart(2, "0")}`,
    value: 80 + i * 0.3,
  }));
}

describe("weightTrendVsGoal", () => {
  it("dispara quando meta é reduzir mas a tendência é subir", () => {
    const store = baseStore({
      activeGoals: [goal("decrease")],
      metricSeries: { "body.weight.avg7d": risingSeries() },
    });
    expect(weightTrendVsGoal.evaluate(store)?.ruleId).toBe("weight_trend_vs_goal");
  });

  it("não dispara sem meta ativa", () => {
    const store = baseStore({ metricSeries: { "body.weight.avg7d": risingSeries() } });
    expect(weightTrendVsGoal.evaluate(store)).toBeNull();
  });

  it("não dispara quando a tendência já está alinhada com a meta", () => {
    const store = baseStore({
      activeGoals: [goal("increase")],
      metricSeries: { "body.weight.avg7d": risingSeries() },
    });
    expect(weightTrendVsGoal.evaluate(store)).toBeNull();
  });
});

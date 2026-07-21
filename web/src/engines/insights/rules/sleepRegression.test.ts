import { describe, expect, it } from "vitest";
import type { MetricSnapshot } from "@/domain/analytics";
import type { MetricStore } from "../types";
import { sleepRegression } from "./sleepRegression";

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

function snapshot(metricId: string, value: number): MetricSnapshot {
  return { id: 1, metricId, periodStart: "", periodEnd: "", value, detail: null, algoVersion: "v1", computedAt: "" };
}

describe("sleepRegression", () => {
  it("dispara quando a média 7d caiu mais de 10% vs 30d", () => {
    const store = baseStore({
      latestMetrics: {
        "sleep.duration.avg7d": snapshot("sleep.duration.avg7d", 5 * 3600),
        "sleep.duration.avg30d": snapshot("sleep.duration.avg30d", 7 * 3600),
      },
    });
    expect(sleepRegression.evaluate(store)?.ruleId).toBe("sleep_regression");
  });

  it("não dispara com queda pequena", () => {
    const store = baseStore({
      latestMetrics: {
        "sleep.duration.avg7d": snapshot("sleep.duration.avg7d", 6.8 * 3600),
        "sleep.duration.avg30d": snapshot("sleep.duration.avg30d", 7 * 3600),
      },
    });
    expect(sleepRegression.evaluate(store)).toBeNull();
  });

  it("não dispara sem os dois rollups disponíveis", () => {
    expect(sleepRegression.evaluate(baseStore())).toBeNull();
  });
});

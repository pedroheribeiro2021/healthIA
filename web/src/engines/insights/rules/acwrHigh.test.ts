import { describe, expect, it } from "vitest";
import type { MetricSnapshot } from "@/domain/analytics";
import type { MetricStore } from "../types";
import { acwrHigh } from "./acwrHigh";

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

function snapshot(value: number): MetricSnapshot {
  return { id: 1, metricId: "training.load.acwr", periodStart: "", periodEnd: "", value, detail: null, algoVersion: "v1", computedAt: "" };
}

describe("acwrHigh", () => {
  it("dispara quando ACWR acima de 1.5", () => {
    const store = baseStore({ latestMetrics: { "training.load.acwr": snapshot(1.8) } });
    expect(acwrHigh.evaluate(store)?.ruleId).toBe("acwr_high");
  });

  it("não dispara com ACWR dentro da faixa segura", () => {
    const store = baseStore({ latestMetrics: { "training.load.acwr": snapshot(1.1) } });
    expect(acwrHigh.evaluate(store)).toBeNull();
  });

  it("não dispara sem dado de ACWR", () => {
    expect(acwrHigh.evaluate(baseStore())).toBeNull();
  });
});

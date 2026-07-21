import { describe, expect, it } from "vitest";
import type { MetricSnapshot } from "@/domain/analytics";
import { evaluateInsightRules } from "./ruleEngine";
import type { MetricStore } from "./types";

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

describe("evaluateInsightRules", () => {
  it("retorna lista vazia sem nenhuma condição disparada", () => {
    expect(evaluateInsightRules(baseStore())).toEqual([]);
  });

  it("agrega insights de múltiplas regras disparadas ao mesmo tempo", () => {
    const store = baseStore({
      latestMetrics: {
        "training.load.acwr": snapshot("training.load.acwr", 2.0),
        "sleep.duration.avg7d": snapshot("sleep.duration.avg7d", 5 * 3600),
        "sleep.duration.avg30d": snapshot("sleep.duration.avg30d", 7 * 3600),
      },
    });

    const insights = evaluateInsightRules(store);
    const ruleIds = insights.map((i) => i.ruleId);
    expect(ruleIds).toContain("acwr_high");
    expect(ruleIds).toContain("sleep_regression");
  });
});

import { describe, expect, it } from "vitest";
import type { MetricStore } from "../types";
import { hrvDropAfterShortSleep } from "./hrvDropAfterShortSleep";

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

describe("hrvDropAfterShortSleep", () => {
  it("dispara quando correlação confirmada + sono curto ontem + HRV abaixo da baseline hoje", () => {
    const store = baseStore({
      correlations: [
        { metricA: "sleep.duration.daily", metricB: "hrv.rmssd.daily", lagDays: 1, rho: 0.6, n: 20 },
      ],
      metricSeries: {
        "sleep.duration.daily": [{ day: "2026-07-20", value: 4 * 3600 }],
      },
      latestMetrics: {
        "hrv.rmssd.daily": {
          id: 1, metricId: "hrv.rmssd.daily", periodStart: "", periodEnd: "",
          value: 30, detail: null, algoVersion: "v1", computedAt: "",
        },
        "hrv.rmssd.baseline60d": {
          id: 2, metricId: "hrv.rmssd.baseline60d", periodStart: "", periodEnd: "",
          value: 50, detail: null, algoVersion: "v1", computedAt: "",
        },
      },
    });

    const insight = hrvDropAfterShortSleep.evaluate(store);
    expect(insight?.ruleId).toBe("hrv_drop_after_short_sleep");
    expect(insight?.evidence).toMatchObject({ hrvToday: 30, hrvBaseline60d: 50 });
  });

  it("não dispara sem correlação confirmada", () => {
    const store = baseStore({
      metricSeries: { "sleep.duration.daily": [{ day: "2026-07-20", value: 4 * 3600 }] },
      latestMetrics: {
        "hrv.rmssd.daily": { id: 1, metricId: "hrv.rmssd.daily", periodStart: "", periodEnd: "", value: 30, detail: null, algoVersion: "v1", computedAt: "" },
        "hrv.rmssd.baseline60d": { id: 2, metricId: "hrv.rmssd.baseline60d", periodStart: "", periodEnd: "", value: 50, detail: null, algoVersion: "v1", computedAt: "" },
      },
    });
    expect(hrvDropAfterShortSleep.evaluate(store)).toBeNull();
  });

  it("não dispara se o sono de ontem não foi curto", () => {
    const store = baseStore({
      correlations: [
        { metricA: "sleep.duration.daily", metricB: "hrv.rmssd.daily", lagDays: 1, rho: 0.6, n: 20 },
      ],
      metricSeries: { "sleep.duration.daily": [{ day: "2026-07-20", value: 8 * 3600 }] },
      latestMetrics: {
        "hrv.rmssd.daily": { id: 1, metricId: "hrv.rmssd.daily", periodStart: "", periodEnd: "", value: 30, detail: null, algoVersion: "v1", computedAt: "" },
        "hrv.rmssd.baseline60d": { id: 2, metricId: "hrv.rmssd.baseline60d", periodStart: "", periodEnd: "", value: 50, detail: null, algoVersion: "v1", computedAt: "" },
      },
    });
    expect(hrvDropAfterShortSleep.evaluate(store)).toBeNull();
  });

  it("não dispara sem dado de HRV (caso real hoje: HRV nunca sincronizado)", () => {
    const store = baseStore({
      correlations: [
        { metricA: "sleep.duration.daily", metricB: "hrv.rmssd.daily", lagDays: 1, rho: 0.6, n: 20 },
      ],
      metricSeries: { "sleep.duration.daily": [{ day: "2026-07-20", value: 4 * 3600 }] },
    });
    expect(hrvDropAfterShortSleep.evaluate(store)).toBeNull();
  });
});

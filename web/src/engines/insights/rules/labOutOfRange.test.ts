import { describe, expect, it } from "vitest";
import type { HealthEvent } from "@/domain/healthEvent";
import type { MetricStore } from "../types";
import { labOutOfRange } from "./labOutOfRange";

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

function labEvent(marker: string, value: number, min: number, max: number): HealthEvent {
  return {
    id: 1,
    eventType: "lab_result",
    startTime: "2026-07-15T12:00:00-03:00",
    endTime: null,
    value,
    unit: "ng/mL",
    detail: { marker, referenceRange: { min, max } },
    source: "lab",
    rawRecordId: 1,
    supersededBy: null,
    createdAt: "2026-07-15T12:00:00-03:00",
  };
}

describe("labOutOfRange", () => {
  it("dispara quando o valor está abaixo do mínimo de referência", () => {
    const store = baseStore({ recentLabResults: [labEvent("vitamin_d", 15, 30, 100)] });
    const insight = labOutOfRange.evaluate(store);
    expect(insight?.ruleId).toBe("lab_out_of_range");
    expect(insight?.evidence).toMatchObject({ marker: "vitamin_d" });
  });

  it("dispara quando o valor está acima do máximo de referência", () => {
    const store = baseStore({ recentLabResults: [labEvent("glucose", 130, 70, 99)] });
    expect(labOutOfRange.evaluate(store)?.ruleId).toBe("lab_out_of_range");
  });

  it("não dispara com valor dentro da faixa", () => {
    const store = baseStore({ recentLabResults: [labEvent("glucose", 85, 70, 99)] });
    expect(labOutOfRange.evaluate(store)).toBeNull();
  });

  it("não dispara sem exames (caso real hoje: import de exames é Fase 5)", () => {
    expect(labOutOfRange.evaluate(baseStore())).toBeNull();
  });
});

import { describe, expect, it } from "vitest";
import type { HealthEvent } from "@/domain/healthEvent";
import { computeBodyFatPctDaily, computeLeanMassDaily } from "./bodyComposition";

const period = { start: "2026-07-20T03:00:00.000Z", end: "2026-07-21T03:00:00.000Z" };

function bodyCompositionEvent(overrides: Partial<HealthEvent> = {}): HealthEvent {
  return {
    id: 1,
    eventType: "body_composition",
    startTime: "2026-07-20T10:00:00.000Z",
    endTime: null,
    value: 82.4,
    unit: "kg",
    detail: { origin: "clinical_bia", bodyFatPercentage: 18.5, leanMassKg: 67.1 },
    source: "manual",
    rawRecordId: null,
    supersededBy: null,
    createdAt: "2026-07-20T10:00:00.000Z",
    ...overrides,
  };
}

describe("computeBodyFatPctDaily", () => {
  it("calcula a média do percentual de gordura no dia", () => {
    const result = computeBodyFatPctDaily([bodyCompositionEvent()], period);
    expect(result.value).toBe(18.5);
    expect(result.metricId).toBe("body.fatpct.daily");
  });

  it("combina relógio e bioimpedância clínica no mesmo dia", () => {
    const events = [
      bodyCompositionEvent({
        id: 1,
        detail: { origin: "watch", bodyFatPercentage: 20 },
      }),
      bodyCompositionEvent({
        id: 2,
        detail: { origin: "clinical_bia", bodyFatPercentage: 18 },
      }),
    ];
    expect(computeBodyFatPctDaily(events, period).value).toBe(19);
  });

  it("retorna null sem eventos no período", () => {
    expect(computeBodyFatPctDaily([], period).value).toBeNull();
  });
});

describe("computeLeanMassDaily", () => {
  it("calcula a massa magra do dia (só bioimpedância clínica reporta)", () => {
    const result = computeLeanMassDaily([bodyCompositionEvent()], period);
    expect(result.value).toBe(67.1);
    expect(result.metricId).toBe("body.leanmass.daily");
  });

  it("ignora eventos do relógio, que não reportam massa magra", () => {
    const events = [
      bodyCompositionEvent({ detail: { origin: "watch", bodyFatPercentage: 20 } }),
    ];
    expect(computeLeanMassDaily(events, period).value).toBeNull();
  });
});

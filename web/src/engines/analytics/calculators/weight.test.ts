import { describe, expect, it } from "vitest";
import type { HealthEvent } from "@/domain/healthEvent";
import { localDayBounds } from "../period";
import { computeWeightDaily } from "./weight";

function weightEvent(startTime: string, value: number): HealthEvent {
  return {
    id: 1,
    eventType: "weight",
    startTime,
    endTime: null,
    value,
    unit: "kg",
    detail: null,
    source: "manual",
    rawRecordId: null,
    supersededBy: null,
    createdAt: startTime,
  };
}

describe("computeWeightDaily", () => {
  it("retorna a média dos pesos do dia", () => {
    const period = localDayBounds("2026-07-20");
    const events = [
      weightEvent("2026-07-20T10:00:00.000Z", 82),
      weightEvent("2026-07-20T20:00:00.000Z", 82.4),
      weightEvent("2026-07-19T10:00:00.000Z", 90), // fora do período
    ];

    const result = computeWeightDaily(events, period);
    expect(result.value).toBeCloseTo(82.2, 5);
    expect(result.detail).toEqual({ n: 2 });
  });

  it("retorna null quando não há peso no dia", () => {
    const period = localDayBounds("2026-07-20");
    const result = computeWeightDaily([], period);
    expect(result.value).toBeNull();
    expect(result.detail).toEqual({ n: 0 });
  });
});

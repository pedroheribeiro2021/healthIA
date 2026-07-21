import { describe, expect, it } from "vitest";
import type { HealthEvent } from "@/domain/healthEvent";
import { localDayBounds } from "../period";
import { computeHrvRmssdDaily } from "./hrv";

function hrvEvent(startTime: string, rmssd: number): HealthEvent {
  return {
    id: 1,
    eventType: "hrv",
    startTime,
    endTime: null,
    value: rmssd,
    unit: "ms",
    detail: { method: "rmssd" },
    source: "health_connect",
    rawRecordId: null,
    supersededBy: null,
    createdAt: startTime,
  };
}

describe("computeHrvRmssdDaily", () => {
  it("calcula a média das leituras de HRV do dia", () => {
    const period = localDayBounds("2026-07-20");
    const events = [
      hrvEvent("2026-07-20T07:00:00.000Z", 40),
      hrvEvent("2026-07-20T08:00:00.000Z", 44),
    ];

    const result = computeHrvRmssdDaily(events, period);
    expect(result.value).toBe(42);
  });

  it("retorna null sem nenhuma leitura (cenário real hoje)", () => {
    const period = localDayBounds("2026-07-20");
    const result = computeHrvRmssdDaily([], period);
    expect(result.value).toBeNull();
  });
});

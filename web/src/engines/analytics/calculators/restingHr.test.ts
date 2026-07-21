import { describe, expect, it } from "vitest";
import type { HealthEvent } from "@/domain/healthEvent";
import { localDayBounds } from "../period";
import { computeRestingHrDaily } from "./restingHr";

function heartRate(startTime: string, bpm: number): HealthEvent {
  return {
    id: 1,
    eventType: "heart_rate",
    startTime,
    endTime: null,
    value: bpm,
    unit: "bpm",
    detail: { context: "continuous" },
    source: "health_connect",
    rawRecordId: null,
    supersededBy: null,
    createdAt: startTime,
  };
}

function sleepSession(startTime: string, endTime: string, durationS: number): HealthEvent {
  return {
    id: 2,
    eventType: "sleep_session",
    startTime,
    endTime,
    value: durationS,
    unit: "s",
    detail: null,
    source: "health_connect",
    rawRecordId: null,
    supersededBy: null,
    createdAt: startTime,
  };
}

describe("computeRestingHrDaily", () => {
  it("usa o mínimo de FC dentro da janela do sono quando há sessão", () => {
    const period = localDayBounds("2026-07-20");
    const events = [
      sleepSession("2026-07-19T23:00:00.000Z", "2026-07-20T06:00:00.000Z", 7 * 3600),
      heartRate("2026-07-20T02:00:00.000Z", 52), // dentro do sono
      heartRate("2026-07-20T14:00:00.000Z", 45), // fora do sono, deve ser ignorado
    ];

    const result = computeRestingHrDaily(events, period);
    expect(result.value).toBe(52);
    expect(result.detail).toEqual({ source: "sleep_window", n: 1 });
  });

  it("cai pro mínimo do dia inteiro sem sessão de sono", () => {
    const period = localDayBounds("2026-07-20");
    const events = [
      heartRate("2026-07-20T14:00:00.000Z", 58),
      heartRate("2026-07-20T15:00:00.000Z", 55),
    ];

    const result = computeRestingHrDaily(events, period);
    expect(result.value).toBe(55);
    expect(result.detail).toEqual({ source: "full_day_fallback", n: 2 });
  });

  it("retorna null sem nenhuma amostra de FC", () => {
    const period = localDayBounds("2026-07-20");
    const result = computeRestingHrDaily([], period);
    expect(result.value).toBeNull();
    expect(result.detail).toEqual({ missing: true });
  });
});

import { describe, expect, it } from "vitest";
import type { HealthEvent } from "@/domain/healthEvent";
import { localDayBounds } from "../period";
import {
  computeSleepBedtimeAvg7d,
  computeSleepDurationDaily,
  computeSleepEfficiencyDaily,
} from "./sleep";

function sleepSession(
  startTime: string,
  endTime: string,
  durationS: number,
  detail: Record<string, unknown> | null = null,
): HealthEvent {
  return {
    id: 1,
    eventType: "sleep_session",
    startTime,
    endTime,
    value: durationS,
    unit: "s",
    detail,
    source: "health_connect",
    rawRecordId: null,
    supersededBy: null,
    createdAt: startTime,
  };
}

describe("computeSleepDurationDaily", () => {
  it("atribui a sessão ao dia em que a pessoa acordou (end_time)", () => {
    const period = localDayBounds("2026-07-20");
    const events = [
      // dormiu 19, acordou 20 -> conta pro dia 20
      sleepSession(
        "2026-07-19T23:30:00.000Z",
        "2026-07-20T06:00:00.000Z",
        7.25 * 3600,
      ),
    ];

    const result = computeSleepDurationDaily(events, period);
    expect(result.value).toBeCloseTo(7.25 * 3600);
    expect(result.detail).toEqual({ otherSessions: 0 });
  });

  it("com mais de uma sessão no dia, usa a de maior duração", () => {
    const period = localDayBounds("2026-07-20");
    const events = [
      sleepSession("2026-07-19T23:00:00.000Z", "2026-07-20T05:00:00.000Z", 6 * 3600),
      sleepSession("2026-07-20T14:00:00.000Z", "2026-07-20T14:30:00.000Z", 1800), // soneca
    ];

    const result = computeSleepDurationDaily(events, period);
    expect(result.value).toBe(6 * 3600);
    expect(result.detail).toEqual({ otherSessions: 1 });
  });

  it("retorna null sem sessão de sono no dia", () => {
    const period = localDayBounds("2026-07-20");
    const result = computeSleepDurationDaily([], period);
    expect(result.value).toBeNull();
    expect(result.detail).toEqual({ missing: "no_sleep_session" });
  });
});

describe("computeSleepEfficiencyDaily", () => {
  it("calcula eficiência a partir do detail.awakeS", () => {
    const period = localDayBounds("2026-07-20");
    const events = [
      sleepSession(
        "2026-07-19T23:00:00.000Z",
        "2026-07-20T07:00:00.000Z",
        8 * 3600,
        { awakeS: 0.1 * 8 * 3600 },
      ),
    ];

    const result = computeSleepEfficiencyDaily(events, period);
    expect(result.value).toBeCloseTo(0.9, 5);
  });

  it("assume awakeS=0 quando ausente no detail", () => {
    const period = localDayBounds("2026-07-20");
    const events = [
      sleepSession("2026-07-19T23:00:00.000Z", "2026-07-20T07:00:00.000Z", 8 * 3600),
    ];

    const result = computeSleepEfficiencyDaily(events, period);
    expect(result.value).toBe(1);
  });
});

describe("computeSleepBedtimeAvg7d", () => {
  it("calcula o horário médio de dormir sem quebrar na virada da meia-noite", () => {
    const period = { start: "2026-07-13T03:00:00.000Z", end: "2026-07-20T03:00:00.000Z" };
    const events = [
      // dormiu 23:30 (America/Sao_Paulo) -> 02:30Z
      sleepSession("2026-07-19T02:30:00.000Z", "2026-07-19T09:00:00.000Z", 6.5 * 3600),
      // dormiu 00:30 (America/Sao_Paulo) -> 03:30Z
      sleepSession("2026-07-19T03:30:00.000Z", "2026-07-19T10:00:00.000Z", 6.5 * 3600),
    ];

    const result = computeSleepBedtimeAvg7d(events, period);
    expect(result.detail).toMatchObject({ n: 2, bedtimeLabel: "00:00" });
  });

  it("retorna null sem sessões no período", () => {
    const period = { start: "2026-07-13T03:00:00.000Z", end: "2026-07-20T03:00:00.000Z" };
    const result = computeSleepBedtimeAvg7d([], period);
    expect(result.value).toBeNull();
  });
});

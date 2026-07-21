import { describe, expect, it } from "vitest";
import type { HealthEvent } from "@/domain/healthEvent";
import { localDayBounds } from "../period";
import { computeTrainingLoadDaily } from "./trainingLoad";

function workout(startTime: string, endTime: string, durationS: number): HealthEvent {
  return {
    id: 1,
    eventType: "workout",
    startTime,
    endTime,
    value: durationS,
    unit: "s",
    detail: { sport: "soccer" },
    source: "health_connect",
    rawRecordId: null,
    supersededBy: null,
    createdAt: startTime,
  };
}

function heartRate(startTime: string, bpm: number): HealthEvent {
  return {
    id: 2,
    eventType: "heart_rate",
    startTime,
    endTime: null,
    value: bpm,
    unit: "bpm",
    detail: null,
    source: "health_connect",
    rawRecordId: null,
    supersededBy: null,
    createdAt: startTime,
  };
}

describe("computeTrainingLoadDaily", () => {
  it("pondera a duração pela intensidade (FC média do treino / FC repouso)", () => {
    const period = localDayBounds("2026-07-20");
    const events = [
      workout("2026-07-20T18:00:00.000Z", "2026-07-20T19:00:00.000Z", 3600), // 60 min
      heartRate("2026-07-20T18:30:00.000Z", 140),
      heartRate("2026-07-20T18:45:00.000Z", 160), // avgHr = 150
    ];

    const result = computeTrainingLoadDaily(events, period, 50);
    // 60 min * (150/50) = 180
    expect(result.value).toBeCloseTo(180, 5);
    expect(result.detail).toMatchObject({ workoutCount: 1, assumedIntensity: false });
  });

  it("cai pra intensityFactor=1 sem FC sobrepondo o treino", () => {
    const period = localDayBounds("2026-07-20");
    const events = [
      workout("2026-07-20T18:00:00.000Z", "2026-07-20T19:00:00.000Z", 3600),
    ];

    const result = computeTrainingLoadDaily(events, period, 50);
    expect(result.value).toBeCloseTo(60, 5);
    expect(result.detail).toMatchObject({ assumedIntensity: true });
  });

  it("retorna 0 (não null) sem nenhum treino no dia", () => {
    const period = localDayBounds("2026-07-20");
    const result = computeTrainingLoadDaily([], period, 50);
    expect(result.value).toBe(0);
  });
});

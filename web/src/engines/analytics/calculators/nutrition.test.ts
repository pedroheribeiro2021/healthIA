import { describe, expect, it } from "vitest";
import type { HealthEvent } from "@/domain/healthEvent";
import { localDayBounds } from "../period";
import { computeKcalInDaily, computeProteinDaily, computeWaterDaily } from "./nutrition";

function mealEvent(
  startTime: string,
  kcal: number | null,
  proteinG: number | null,
): HealthEvent {
  return {
    id: 1,
    eventType: "meal",
    startTime,
    endTime: null,
    value: kcal,
    unit: kcal != null ? "kcal" : null,
    detail: { mealType: "other", description: "teste", proteinG, carbsG: null, fatG: null },
    source: "manual",
    rawRecordId: null,
    supersededBy: null,
    createdAt: startTime,
  };
}

function hydrationEvent(startTime: string, liters: number): HealthEvent {
  return {
    id: 1,
    eventType: "hydration",
    startTime,
    endTime: null,
    value: liters,
    unit: "l",
    detail: null,
    source: "manual",
    rawRecordId: null,
    supersededBy: null,
    createdAt: startTime,
  };
}

describe("computeKcalInDaily", () => {
  it("soma o kcal de todas as refeições do dia", () => {
    const period = localDayBounds("2026-07-20");
    const events = [
      mealEvent("2026-07-20T10:00:00.000Z", 400, 20),
      mealEvent("2026-07-20T20:00:00.000Z", 600, 40),
      mealEvent("2026-07-19T20:00:00.000Z", 900, 50), // fora do período
    ];

    const result = computeKcalInDaily(events, period);
    expect(result.value).toBe(1000);
    expect(result.detail).toEqual({ n: 2 });
  });

  it("ignora refeição sem kcal registrado", () => {
    const period = localDayBounds("2026-07-20");
    const events = [mealEvent("2026-07-20T10:00:00.000Z", null, 20)];

    const result = computeKcalInDaily(events, period);
    expect(result.value).toBeNull();
    expect(result.detail).toEqual({ n: 0 });
  });

  it("retorna null quando não há refeição no dia", () => {
    const period = localDayBounds("2026-07-20");
    const result = computeKcalInDaily([], period);
    expect(result.value).toBeNull();
    expect(result.detail).toEqual({ n: 0 });
  });
});

describe("computeProteinDaily", () => {
  it("soma a proteína de todas as refeições do dia", () => {
    const period = localDayBounds("2026-07-20");
    const events = [
      mealEvent("2026-07-20T10:00:00.000Z", 400, 20),
      mealEvent("2026-07-20T20:00:00.000Z", 600, 40),
    ];

    const result = computeProteinDaily(events, period);
    expect(result.value).toBe(60);
    expect(result.detail).toEqual({ n: 2 });
  });

  it("ignora refeição sem proteína registrada", () => {
    const period = localDayBounds("2026-07-20");
    const events = [
      mealEvent("2026-07-20T10:00:00.000Z", 400, null),
      mealEvent("2026-07-20T20:00:00.000Z", 600, 40),
    ];

    const result = computeProteinDaily(events, period);
    expect(result.value).toBe(40);
    expect(result.detail).toEqual({ n: 1 });
  });
});

describe("computeWaterDaily", () => {
  it("soma a água de todos os registros do dia", () => {
    const period = localDayBounds("2026-07-20");
    const events = [
      hydrationEvent("2026-07-20T10:00:00.000Z", 0.25),
      hydrationEvent("2026-07-20T14:00:00.000Z", 0.5),
      hydrationEvent("2026-07-19T20:00:00.000Z", 1), // fora do período
    ];

    const result = computeWaterDaily(events, period);
    expect(result.value).toBeCloseTo(0.75, 5);
    expect(result.detail).toEqual({ n: 2 });
  });

  it("retorna null quando não há hidratação no dia", () => {
    const period = localDayBounds("2026-07-20");
    const result = computeWaterDaily([], period);
    expect(result.value).toBeNull();
    expect(result.detail).toEqual({ n: 0 });
  });
});

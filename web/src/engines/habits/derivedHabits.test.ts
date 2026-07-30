import { describe, expect, it } from "vitest";
import type { HealthEvent } from "@/domain/healthEvent";
import { localDayBounds } from "@/engines/analytics/period";
import { resolveDerivedHabit } from "./derivedHabits";

const DAY = "2026-07-20";
const PERIOD = localDayBounds(DAY);

function event(overrides: Partial<HealthEvent> = {}): HealthEvent {
  return {
    id: 1,
    eventType: "workout",
    startTime: `${DAY}T15:00:00.000Z`,
    endTime: null,
    value: null,
    unit: null,
    detail: null,
    source: "health_connect",
    rawRecordId: null,
    supersededBy: null,
    createdAt: `${DAY}T15:00:00.000Z`,
    ...overrides,
  };
}

describe("resolveDerivedHabit", () => {
  it("musculacao: true quando há ao menos 1 workout no dia", () => {
    const result = resolveDerivedHabit(
      "musculacao",
      DAY,
      PERIOD,
      [event({ eventType: "workout" })],
      null,
    );
    expect(result).toEqual({ done: true, quantity: null });
  });

  it("musculacao: false sem workout no dia", () => {
    const result = resolveDerivedHabit("musculacao", DAY, PERIOD, [], null);
    expect(result).toEqual({ done: false, quantity: null });
  });

  it("agua: soma hydration do dia e compara com a meta", () => {
    const events = [
      event({ eventType: "hydration", value: 1.5 }),
      event({ eventType: "hydration", value: 1.6 }),
    ];
    const result = resolveDerivedHabit("agua", DAY, PERIOD, events, 3.0);
    expect(result).toEqual({ done: true, quantity: 3.1 });
  });

  it("agua: false quando soma fica abaixo da meta", () => {
    const events = [event({ eventType: "hydration", value: 1.0 })];
    const result = resolveDerivedHabit("agua", DAY, PERIOD, events, 3.0);
    expect(result).toEqual({ done: false, quantity: 1.0 });
  });

  it("agua: sem nenhum registro no dia retorna quantity null", () => {
    const result = resolveDerivedHabit("agua", DAY, PERIOD, [], 3.0);
    expect(result).toEqual({ done: false, quantity: null });
  });

  it("dormir_cedo: true quando a sessão principal começa antes das 23h (deitou na noite anterior)", () => {
    const events = [
      event({
        eventType: "sleep_session",
        startTime: "2026-07-19T22:30:00.000-03:00", // deitou 22:30 local
        endTime: `${DAY}T09:00:00.000Z`, // acordou 06:00 local do dia (DAY)
        value: 27000,
      }),
    ];
    const result = resolveDerivedHabit("dormir_cedo", DAY, PERIOD, events, null);
    expect(result?.done).toBe(true);
  });

  it("dormir_cedo: false quando a sessão principal começa depois das 23h", () => {
    const events = [
      event({
        eventType: "sleep_session",
        startTime: "2026-07-19T23:30:00.000-03:00", // deitou 23:30 local
        endTime: `${DAY}T09:00:00.000Z`,
        value: 23400,
      }),
    ];
    const result = resolveDerivedHabit("dormir_cedo", DAY, PERIOD, events, null);
    expect(result?.done).toBe(false);
  });

  it("dormir_cedo: false sem sessão de sono atribuída ao dia", () => {
    const result = resolveDerivedHabit("dormir_cedo", DAY, PERIOD, [], null);
    expect(result).toEqual({ done: false, quantity: null });
  });

  it("slug desconhecido retorna null", () => {
    expect(resolveDerivedHabit("nao_existe", DAY, PERIOD, [], null)).toBeNull();
  });
});

import { describe, expect, it } from "vitest";
import {
  addDays,
  isWithinPeriod,
  lastNDays,
  localDayBounds,
  toLocalDay,
} from "./period";

describe("toLocalDay", () => {
  it("converte um instante UTC para o dia local America/Sao_Paulo", () => {
    // 2026-07-20T02:30:00Z = 2026-07-19T23:30:00-03:00 -> ainda dia 19 local
    expect(toLocalDay("2026-07-20T02:30:00.000Z")).toBe("2026-07-19");
  });

  it("vira o dia local corretamente logo após a meia-noite -03:00", () => {
    // 2026-07-20T03:00:00Z = 2026-07-20T00:00:00-03:00
    expect(toLocalDay("2026-07-20T03:00:00.000Z")).toBe("2026-07-20");
  });
});

describe("localDayBounds", () => {
  it("retorna início/fim em UTC de um dia local", () => {
    const { start, end } = localDayBounds("2026-07-20");
    expect(start).toBe("2026-07-20T03:00:00.000Z");
    expect(end).toBe("2026-07-21T03:00:00.000Z");
  });
});

describe("addDays", () => {
  it("soma dias respeitando virada de mês", () => {
    expect(addDays("2026-07-31", 1)).toBe("2026-08-01");
  });

  it("subtrai dias respeitando virada de ano", () => {
    expect(addDays("2026-01-01", -1)).toBe("2025-12-31");
  });
});

describe("isWithinPeriod", () => {
  const period = localDayBounds("2026-07-20");

  it("é true dentro do período (limite inicial inclusive)", () => {
    expect(isWithinPeriod(period.start, period)).toBe(true);
  });

  it("é false no limite final (exclusive)", () => {
    expect(isWithinPeriod(period.end, period)).toBe(false);
  });

  it("é false fora do período", () => {
    expect(isWithinPeriod("2026-07-19T12:00:00.000Z", period)).toBe(false);
  });
});

describe("lastNDays", () => {
  it("retorna os últimos n dias em ordem ascendente, incluindo o dia final", () => {
    expect(lastNDays("2026-07-20", 3)).toEqual([
      "2026-07-18",
      "2026-07-19",
      "2026-07-20",
    ]);
  });
});

import { describe, expect, it } from "vitest";
import type { TimeSeries } from "@/domain/analytics";
import { computeAcwr } from "./acwr";

function flatSeries(nDays: number, value: number | null): TimeSeries {
  return Array.from({ length: nDays }, (_, i) => ({
    day: `day-${i}`,
    value,
  }));
}

describe("computeAcwr", () => {
  it("acwr = 1 quando carga aguda e crônica são iguais (regime estável)", () => {
    const series = flatSeries(28, 10); // 10 de carga todo dia
    const result = computeAcwr(series, { start: "s", end: "e" });
    expect(result.value).toBeCloseTo(1, 5);
    expect(result.detail).toMatchObject({ insufficientData: false });
  });

  it("acwr > 1 quando a semana recente teve mais carga que o normal", () => {
    const series = [...flatSeries(21, 5), ...flatSeries(7, 20)]; // 21 dias leves + 7 dias pesados
    const result = computeAcwr(series, { start: "s", end: "e" });
    expect(result.value).toBeGreaterThan(1);
  });

  it("marca insufficientData com menos de 7 dias de histórico", () => {
    const series = flatSeries(3, 10);
    const result = computeAcwr(series, { start: "s", end: "e" });
    expect(result.detail).toMatchObject({ insufficientData: true });
  });

  it("retorna null quando não há carga crônica (tudo zero/vazio)", () => {
    const result = computeAcwr([], { start: "s", end: "e" });
    expect(result.value).toBeNull();
  });
});

import { describe, expect, it } from "vitest";
import type { TimeSeries } from "@/domain/analytics";
import { findCorrelations } from "./correlationFinder";
import { addDays } from "./period";

function buildSeries(startDay: string, values: (number | null)[]): TimeSeries {
  return values.map((value, i) => ({ day: addDays(startDay, i), value }));
}

describe("findCorrelations", () => {
  it("encontra correlação defasada em 1 dia (sono curto -> HRV menor no dia seguinte)", () => {
    const sleep = buildSeries("2026-01-01", [
      4, 8, 4, 8, 4, 8, 4, 8, 4, 8, 4, 8, 4, 8, 4,
    ]);
    // hrv[dia] segue sleep[dia-1]: sono curto ontem -> HRV baixo hoje.
    const hrv = buildSeries("2026-01-01", [
      50, 30, 70, 30, 70, 30, 70, 30, 70, 30, 70, 30, 70, 30, 70,
    ]);

    const results = findCorrelations({
      "sleep.duration.daily": sleep,
      "hrv.rmssd.daily": hrv,
    });

    const found = results.find(
      (r) =>
        r.metricA === "sleep.duration.daily" &&
        r.metricB === "hrv.rmssd.daily" &&
        r.lagDays === 1,
    );
    expect(found).toBeDefined();
    expect(found?.rho).toBeGreaterThan(0.5);
    expect(found?.n).toBeGreaterThanOrEqual(14);
  });

  it("não reporta nada entre séries com poucos pontos", () => {
    const a = buildSeries("2026-01-01", [1, 2, 3, 4, 5]);
    const b = buildSeries("2026-01-01", [5, 4, 3, 2, 1]);

    expect(findCorrelations({ a, b })).toEqual([]);
  });

  it("não reporta correlação para ruído sem relação real", () => {
    const noiseA = [3, 1, 4, 1, 5, 9, 2, 6, 5, 3, 5, 8, 9, 7, 9, 3];
    const noiseB = [2, 7, 1, 8, 2, 8, 1, 8, 2, 8, 4, 5, 9, 0, 5, 3];
    const a = buildSeries("2026-01-01", noiseA);
    const b = buildSeries("2026-01-01", noiseB);

    const results = findCorrelations({ a, b });
    expect(results).toEqual([]);
  });

  it("ignora dias com valor nulo em qualquer um dos lados", () => {
    const a = buildSeries("2026-01-01", [
      1, null, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15,
    ]);
    const b = buildSeries("2026-01-01", [
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15,
    ]);

    // 14 pares válidos (um dia descartado por causa do null) ainda passam
    // no limiar mínimo de 14 — não deve lançar nem incluir o par com null.
    const results = findCorrelations({ a, b });
    const lag0 = results.find((r) => r.lagDays === 0);
    expect(lag0?.n).toBe(14);
  });

  it("testa cada par desordenado só uma vez no lag 0", () => {
    const a = buildSeries("2026-01-01", [
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14,
    ]);
    const b = buildSeries("2026-01-01", [
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14,
    ]);

    const results = findCorrelations({ a, b }, 0);
    expect(results).toHaveLength(1);
  });
});

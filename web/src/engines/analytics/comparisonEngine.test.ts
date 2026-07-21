import { describe, expect, it } from "vitest";
import type { TimeSeries } from "@/domain/analytics";
import { compare } from "./comparisonEngine";

const periodA = { start: "2026-07-14T00:00:00.000Z", end: "2026-07-21T00:00:00.000Z" };
const periodB = { start: "2026-07-07T00:00:00.000Z", end: "2026-07-14T00:00:00.000Z" };

function series(values: number[]): TimeSeries {
  return values.map((value, i) => ({ day: `day-${i}`, value }));
}

describe("compare", () => {
  it("detecta diferença significativa entre semanas", () => {
    const result = compare(
      "hr.resting.daily",
      periodA,
      series([50, 51, 50, 49, 50]),
      periodB,
      series([60, 61, 59, 60, 60]),
    );
    expect(result.significant).toBe(true);
    expect(result.deltaAbs).toBeLessThan(0);
    expect(result.insufficientData).toBe(false);
  });

  it("não marca como significativo quando as semanas são parecidas", () => {
    const result = compare(
      "hr.resting.daily",
      periodA,
      series([50, 51, 49, 50, 50]),
      periodB,
      series([50, 49, 51, 50, 50]),
    );
    expect(result.significant).toBe(false);
  });

  it("marca insufficientData quando um dos períodos não tem dado", () => {
    const result = compare("hr.resting.daily", periodA, series([]), periodB, series([50]));
    expect(result.insufficientData).toBe(true);
  });
});

import { describe, expect, it } from "vitest";
import type { TimeSeries } from "@/domain/analytics";
import { analyzeTrend } from "./trendAnalyzer";

function series(values: (number | null)[]): TimeSeries {
  return values.map((value, i) => ({
    day: `2026-07-${String(i + 1).padStart(2, "0")}`,
    value,
  }));
}

describe("analyzeTrend", () => {
  it("identifica tendência de alta clara", () => {
    const result = analyzeTrend(series([10, 12, 14, 16, 18, 20]));
    expect(result.direction).toBe("up");
    expect(result.insufficientData).toBe(false);
    expect(result.confidence).toBeGreaterThan(0.9);
  });

  it("identifica tendência de queda clara", () => {
    const result = analyzeTrend(series([20, 18, 16, 14, 12, 10]));
    expect(result.direction).toBe("down");
  });

  it("classifica como flat quando a variação é pequena", () => {
    const result = analyzeTrend(series([50, 50.2, 49.9, 50.1, 50, 49.8]));
    expect(result.direction).toBe("flat");
  });

  it("ignora pontos com value null", () => {
    const result = analyzeTrend(series([10, null, 12, null, 14, 16]));
    expect(result.direction).toBe("up");
  });

  it("marca insufficientData com menos de 3 pontos válidos", () => {
    const result = analyzeTrend(series([10, null, null, 12]));
    expect(result.insufficientData).toBe(true);
    expect(result.direction).toBe("flat");
  });
});

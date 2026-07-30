import { describe, expect, it } from "vitest";
import type { DailySummary, Period } from "@/domain/analytics";
import { buildReport } from "./reportBuilder";

function summary(day: string, overrides: Partial<DailySummary> = {}): DailySummary {
  return {
    day,
    sleepDurationS: null,
    sleepScore: null,
    restingHr: null,
    hrvRmssd: null,
    steps: null,
    workouts: null,
    trainingLoad: null,
    kcalIn: null,
    proteinG: null,
    waterL: null,
    weightKg: null,
    recoveryScore: null,
    computedAt: `${day}T12:00:00.000Z`,
    ...overrides,
  };
}

const periodCurrent: Period = {
  start: "2026-07-15T03:00:00.000Z",
  end: "2026-07-22T03:00:00.000Z",
};
const periodPrevious: Period = {
  start: "2026-07-08T03:00:00.000Z",
  end: "2026-07-15T03:00:00.000Z",
};

describe("buildReport", () => {
  it("compara período atual vs anterior por campo, usando compare/analyzeTrend existentes", () => {
    const current = [
      summary("2026-07-16", { weightKg: 82 }),
      summary("2026-07-17", { weightKg: 80 }),
      summary("2026-07-18", { weightKg: 78 }),
      summary("2026-07-19", { weightKg: 76 }),
    ];
    const previous = [
      summary("2026-07-09", { weightKg: 86 }),
      summary("2026-07-10", { weightKg: 85 }),
      summary("2026-07-11", { weightKg: 84 }),
    ];

    const report = buildReport("weekly", periodCurrent, periodPrevious, current, previous, []);

    expect(report.kind).toBe("weekly");
    const weight = report.metrics.find((m) => m.key === "weightKg");
    expect(weight).toBeDefined();
    expect(weight?.comparison.insufficientData).toBe(false);
    expect(weight?.comparison.meanA).toBeCloseTo(79, 2);
    expect(weight?.comparison.meanB).toBeCloseTo(85, 2);
    expect(weight?.trendDirection).toBe("down");
  });

  it("marca insufficientData quando um dos períodos não tem nenhum valor", () => {
    const current = [summary("2026-07-16", { hrvRmssd: 55 })];
    const previous: DailySummary[] = [];

    const report = buildReport("weekly", periodCurrent, periodPrevious, current, previous, []);
    const hrv = report.metrics.find((m) => m.key === "hrvRmssd");
    expect(hrv?.comparison.insufficientData).toBe(true);
  });

  it("inclui as metas passadas sem alterá-las", () => {
    const goalsWithProgress = [
      {
        goal: {
          id: 1,
          metricId: "body.weight.avg7d",
          targetValue: 75,
          direction: "decrease" as const,
          deadline: null,
          active: true,
          createdAt: "2026-07-01T00:00:00.000Z",
        },
        currentValue: 78,
      },
    ];

    const report = buildReport(
      "monthly",
      periodCurrent,
      periodPrevious,
      [summary("2026-07-16")],
      [summary("2026-07-09")],
      goalsWithProgress,
    );

    expect(report.goals).toEqual(goalsWithProgress);
  });

  it("cobre todos os campos fixos do relatório", () => {
    const report = buildReport(
      "weekly",
      periodCurrent,
      periodPrevious,
      [summary("2026-07-16")],
      [summary("2026-07-09")],
      [],
    );

    const keys = report.metrics.map((m) => m.key);
    expect(keys).toEqual([
      "recoveryScore",
      "sleepDurationS",
      "restingHr",
      "hrvRmssd",
      "trainingLoad",
      "weightKg",
      "proteinG",
      "kcalIn",
      "waterL",
      "steps",
    ]);
  });
});

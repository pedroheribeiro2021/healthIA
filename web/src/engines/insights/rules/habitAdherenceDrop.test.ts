import { describe, expect, it } from "vitest";
import type { DailySummary } from "@/domain/analytics";
import type { MetricStore } from "../types";
import { habitAdherenceDrop } from "./habitAdherenceDrop";

function baseStore(overrides: Partial<MetricStore> = {}): MetricStore {
  return {
    day: "2026-07-21",
    todaySummary: null,
    recentDailySummaries: [],
    latestMetrics: {},
    metricSeries: {},
    correlations: [],
    recentWorkouts: [],
    recentLabResults: [],
    activeGoals: [],
    habits: [],
    recentHabitLogs: [],
    ...overrides,
  };
}

function summary(day: string, habitAdherencePct: number | null): DailySummary {
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
    habitAdherencePct,
    bodyFatPct: null,
    computedAt: `${day}T12:00:00.000Z`,
  };
}

function days(from: number, to: number, value: number): DailySummary[] {
  return Array.from({ length: to - from + 1 }, (_, i) =>
    summary(`2026-07-${String(from + i).padStart(2, "0")}`, value),
  );
}

describe("habitAdherenceDrop", () => {
  it("não dispara sem nenhum dado de adesão", () => {
    expect(habitAdherenceDrop.evaluate(baseStore())).toBeNull();
  });

  it("dispara quando a adesão dos últimos 7 dias está abaixo de 60%", () => {
    const store = baseStore({ recentDailySummaries: days(15, 21, 40) });
    const result = habitAdherenceDrop.evaluate(store);
    expect(result?.ruleId).toBe("habit_adherence_drop");
    expect(result?.evidence).toMatchObject({ avgAdherence7d: 40 });
  });

  it("não dispara quando a adesão está alta e estável", () => {
    const store = baseStore({
      recentDailySummaries: [...days(8, 14, 90), ...days(15, 21, 85)],
    });
    expect(habitAdherenceDrop.evaluate(store)).toBeNull();
  });

  it("dispara por queda de >=20pp mesmo sem estar abaixo de 60%", () => {
    const store = baseStore({
      recentDailySummaries: [...days(8, 14, 90), ...days(15, 21, 65)],
    });
    const result = habitAdherenceDrop.evaluate(store);
    expect(result?.ruleId).toBe("habit_adherence_drop");
    expect(result?.evidence).toMatchObject({ dropPp: 25 });
  });

  it("não dispara por queda pequena (<20pp) acima do piso de 60%", () => {
    const store = baseStore({
      recentDailySummaries: [...days(8, 14, 90), ...days(15, 21, 80)],
    });
    expect(habitAdherenceDrop.evaluate(store)).toBeNull();
  });
});

import { describe, expect, it } from "vitest";
import type {
  DailySummary,
  MetricSnapshot,
  NewDailySummary,
  NewMetricSnapshot,
} from "@/domain/analytics";
import type { EventRepository, MetricRepository } from "@/domain/repositories";
import type { HealthEvent } from "@/domain/healthEvent";
import { recomputeDay } from "./analyticsService";

function createFakeEventRepository(events: HealthEvent[]): EventRepository {
  return {
    async insertRawRecord() {
      throw new Error("não usado neste teste");
    },
    async listPendingRawRecords() {
      return [];
    },
    async markRawRecordNormalized() {},
    async insertHealthEvents() {
      throw new Error("não usado neste teste");
    },
    async listHealthEvents(params) {
      return events.filter((e) => {
        if (params.eventType && e.eventType !== params.eventType) return false;
        if (params.from && e.startTime < params.from) return false;
        if (params.to && e.startTime >= params.to) return false;
        return true;
      });
    },
  };
}

function createFakeMetricRepository(): MetricRepository & {
  snapshots: MetricSnapshot[];
  summaries: DailySummary[];
} {
  const snapshots: MetricSnapshot[] = [];
  const summaries: DailySummary[] = [];
  let nextId = 1;

  return {
    snapshots,
    summaries,

    async upsertMetricSnapshots(newSnapshots: NewMetricSnapshot[]) {
      const result: MetricSnapshot[] = [];
      for (const s of newSnapshots) {
        const existingIndex = snapshots.findIndex(
          (existing) =>
            existing.metricId === s.metricId &&
            existing.periodStart === s.periodStart &&
            existing.periodEnd === s.periodEnd &&
            existing.algoVersion === s.algoVersion,
        );
        const row: MetricSnapshot = {
          id: existingIndex >= 0 ? snapshots[existingIndex].id : nextId++,
          ...s,
          computedAt: new Date().toISOString(),
        };
        if (existingIndex >= 0) snapshots[existingIndex] = row;
        else snapshots.push(row);
        result.push(row);
      }
      return result;
    },

    async listMetricSnapshots(params) {
      return snapshots.filter((s) => {
        if (params.metricId && s.metricId !== params.metricId) return false;
        if (params.algoVersion && s.algoVersion !== params.algoVersion)
          return false;
        if (params.from && s.periodStart < params.from) return false;
        if (params.to && s.periodEnd > params.to) return false;
        return true;
      });
    },

    async upsertDailySummary(summary: NewDailySummary) {
      const existingIndex = summaries.findIndex((s) => s.day === summary.day);
      const row: DailySummary = { ...summary, computedAt: new Date().toISOString() };
      if (existingIndex >= 0) summaries[existingIndex] = row;
      else summaries.push(row);
      return row;
    },

    async getDailySummary(day) {
      return summaries.find((s) => s.day === day) ?? null;
    },

    async getLatestDailySummary() {
      if (summaries.length === 0) return null;
      return [...summaries].sort((a, b) => b.day.localeCompare(a.day))[0];
    },

    async listDailySummaries(params) {
      return summaries
        .filter((s) => s.day >= params.from && s.day <= params.to)
        .sort((a, b) => a.day.localeCompare(b.day));
    },
  };
}

function sleepSession(startTime: string, endTime: string, durationS: number): HealthEvent {
  return {
    id: 1,
    eventType: "sleep_session",
    startTime,
    endTime,
    value: durationS,
    unit: "s",
    detail: { awakeS: 0 },
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

function workout(startTime: string, endTime: string, durationS: number): HealthEvent {
  return {
    id: 3,
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

function weight(startTime: string, kg: number): HealthEvent {
  return {
    id: 4,
    eventType: "weight",
    startTime,
    endTime: null,
    value: kg,
    unit: "kg",
    detail: null,
    source: "manual",
    rawRecordId: null,
    supersededBy: null,
    createdAt: startTime,
  };
}

function steps(startTime: string, count: number): HealthEvent {
  return {
    id: 5,
    eventType: "steps",
    startTime,
    endTime: startTime,
    value: count,
    unit: "count",
    detail: null,
    source: "health_connect",
    rawRecordId: null,
    supersededBy: null,
    createdAt: startTime,
  };
}

describe("recomputeDay", () => {
  it("calcula um dia com sono, treino, peso e passos completos", async () => {
    const events = [
      sleepSession("2026-07-19T23:00:00.000Z", "2026-07-20T06:00:00.000Z", 7 * 3600),
      heartRate("2026-07-20T02:00:00.000Z", 50), // dentro do sono -> resting hr
      workout("2026-07-20T18:00:00.000Z", "2026-07-20T19:00:00.000Z", 3600),
      heartRate("2026-07-20T18:30:00.000Z", 140), // durante o treino
      weight("2026-07-20T07:00:00.000Z", 82.5),
      steps("2026-07-20T10:00:00.000Z", 5000),
      steps("2026-07-20T16:00:00.000Z", 3000),
    ];

    const eventRepo = createFakeEventRepository(events);
    const metricRepo = createFakeMetricRepository();

    const summary = await recomputeDay(eventRepo, metricRepo, "2026-07-20");

    expect(summary.sleepDurationS).toBe(7 * 3600);
    expect(summary.restingHr).toBe(50);
    expect(summary.weightKg).toBe(82.5);
    expect(summary.steps).toBe(8000);
    expect(summary.workouts).toBe(1);
    expect(summary.trainingLoad).toBeGreaterThan(0);
    // sono + FC repouso presentes, sem HRV/ACWR (histórico insuficiente) ->
    // recovery score calculado só com os componentes presentes.
    expect(summary.recoveryScore).not.toBeNull();
  });

  it("dia sem nenhum evento não quebra e retorna tudo null/zero", async () => {
    const eventRepo = createFakeEventRepository([]);
    const metricRepo = createFakeMetricRepository();

    const summary = await recomputeDay(eventRepo, metricRepo, "2026-07-20");

    expect(summary.sleepDurationS).toBeNull();
    expect(summary.restingHr).toBeNull();
    expect(summary.weightKg).toBeNull();
    expect(summary.steps).toBeNull();
    expect(summary.workouts).toBe(0);
    expect(summary.trainingLoad).toBe(0);
    expect(summary.recoveryScore).toBeNull();
  });

  it("é idempotente — chamar duas vezes não duplica snapshots nem summary", async () => {
    const events = [weight("2026-07-20T07:00:00.000Z", 82.5)];
    const eventRepo = createFakeEventRepository(events);
    const metricRepo = createFakeMetricRepository();

    await recomputeDay(eventRepo, metricRepo, "2026-07-20");
    const countAfterFirst = metricRepo.snapshots.length;
    await recomputeDay(eventRepo, metricRepo, "2026-07-20");

    expect(metricRepo.snapshots.length).toBe(countAfterFirst);
    expect(metricRepo.summaries.length).toBe(1);
  });
});

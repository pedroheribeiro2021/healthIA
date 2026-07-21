import { describe, expect, it } from "vitest";
import type { DailySummary, MetricSnapshot } from "@/domain/analytics";
import type { Goal } from "@/domain/goals";
import type { HealthEvent } from "@/domain/healthEvent";
import type { Insight, NewInsight } from "@/domain/insights";
import type {
  EventRepository,
  GoalRepository,
  InsightRepository,
  MetricRepository,
} from "@/domain/repositories";
import { localDayBounds } from "../analytics/period";
import { recomputeInsights } from "./insightService";

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

function createFakeMetricRepository(
  snapshots: MetricSnapshot[],
  summaries: DailySummary[],
): MetricRepository {
  return {
    async upsertMetricSnapshots() {
      throw new Error("não usado neste teste");
    },
    async listMetricSnapshots(params) {
      return snapshots.filter((s) => {
        if (params.metricId && s.metricId !== params.metricId) return false;
        if (params.from && s.periodStart < params.from) return false;
        if (params.to && s.periodEnd > params.to) return false;
        return true;
      });
    },
    async upsertDailySummary() {
      throw new Error("não usado neste teste");
    },
    async getDailySummary(day) {
      return summaries.find((s) => s.day === day) ?? null;
    },
    async getLatestDailySummary() {
      throw new Error("não usado neste teste");
    },
    async listDailySummaries(params) {
      return summaries.filter((s) => s.day >= params.from && s.day <= params.to);
    },
  };
}

function createFakeGoalRepository(goals: Goal[]): GoalRepository {
  return {
    async listActiveGoals() {
      return goals;
    },
  };
}

function createFakeInsightRepository(): InsightRepository & { inserted: Insight[] } {
  const inserted: Insight[] = [];
  let nextId = 1;

  return {
    inserted,
    async insertInsight(insight: NewInsight) {
      const row: Insight = {
        id: nextId++,
        ...insight,
        dismissed: false,
        createdAt: new Date().toISOString(),
      };
      inserted.push(row);
      return row;
    },
    async findActiveByRuleAndPeriod(params) {
      return (
        inserted.find(
          (i) =>
            i.ruleId === params.ruleId &&
            i.periodStart === params.periodStart &&
            i.periodEnd === params.periodEnd &&
            !i.dismissed,
        ) ?? null
      );
    },
    async listActive(params) {
      return inserted.filter(
        (i) => !i.dismissed && i.createdAt >= params.from && i.createdAt <= params.to,
      );
    },
  };
}

function acwrSnapshot(day: string, value: number): MetricSnapshot {
  const period = localDayBounds(day);
  return {
    id: 1,
    metricId: "training.load.acwr",
    periodStart: period.start,
    periodEnd: period.end,
    value,
    detail: null,
    algoVersion: "v1",
    computedAt: "",
  };
}

describe("recomputeInsights", () => {
  it("dispara e persiste um insight quando uma regra é atendida", async () => {
    const eventRepo = createFakeEventRepository([]);
    const metricRepo = createFakeMetricRepository([acwrSnapshot("2026-07-21", 1.8)], []);
    const goalRepo = createFakeGoalRepository([]);
    const insightRepo = createFakeInsightRepository();

    const result = await recomputeInsights(
      eventRepo,
      metricRepo,
      goalRepo,
      insightRepo,
      "2026-07-21",
    );

    expect(result).toHaveLength(1);
    expect(result[0].ruleId).toBe("acwr_high");
    expect(insightRepo.inserted).toHaveLength(1);
  });

  it("não duplica o mesmo insight ao recalcular o mesmo dia duas vezes", async () => {
    const eventRepo = createFakeEventRepository([]);
    const metricRepo = createFakeMetricRepository([acwrSnapshot("2026-07-21", 1.8)], []);
    const goalRepo = createFakeGoalRepository([]);
    const insightRepo = createFakeInsightRepository();

    await recomputeInsights(eventRepo, metricRepo, goalRepo, insightRepo, "2026-07-21");
    await recomputeInsights(eventRepo, metricRepo, goalRepo, insightRepo, "2026-07-21");

    expect(insightRepo.inserted).toHaveLength(1);
  });

  it("retorna lista vazia quando nenhuma regra dispara", async () => {
    const eventRepo = createFakeEventRepository([]);
    const metricRepo = createFakeMetricRepository([], []);
    const goalRepo = createFakeGoalRepository([]);
    const insightRepo = createFakeInsightRepository();

    const result = await recomputeInsights(
      eventRepo,
      metricRepo,
      goalRepo,
      insightRepo,
      "2026-07-21",
    );

    expect(result).toEqual([]);
  });
});

import { describe, expect, it } from "vitest";
import type { Goal } from "@/domain/goals";
import type { Insight } from "@/domain/insights";
import type { NewRecommendation, Recommendation } from "@/domain/recommendations";
import type {
  GoalRepository,
  InsightRepository,
  RecommendationRepository,
} from "@/domain/repositories";
import { refreshRecommendations } from "./recommendationService";

function createFakeGoalRepository(goals: Goal[]): GoalRepository {
  return {
    async listActiveGoals() {
      return goals;
    },
    async listGoals() {
      throw new Error("não usado neste teste");
    },
    async createGoal() {
      throw new Error("não usado neste teste");
    },
    async deactivateGoal() {
      throw new Error("não usado neste teste");
    },
  };
}

function createFakeInsightRepository(insights: Insight[]): InsightRepository {
  return {
    async insertInsight() {
      throw new Error("não usado neste teste");
    },
    async findActiveByRuleAndPeriod() {
      throw new Error("não usado neste teste");
    },
    async listActive() {
      return insights;
    },
  };
}

function createFakeRecommendationRepository(): RecommendationRepository & {
  inserted: Recommendation[];
} {
  const inserted: Recommendation[] = [];
  let nextId = 1;

  return {
    inserted,
    async insertRecommendation(recommendation: NewRecommendation) {
      const row: Recommendation = {
        id: nextId++,
        ...recommendation,
        status: "open",
        createdAt: new Date().toISOString(),
      };
      inserted.push(row);
      return row;
    },
    async findOpenByInsightId(insightId) {
      return inserted.find((r) => r.insightId === insightId && r.status === "open") ?? null;
    },
    async listByStatus(status) {
      return inserted.filter((r) => r.status === status);
    },
    async updateStatus(id, status) {
      const row = inserted.find((r) => r.id === id);
      if (!row) throw new Error("não encontrado");
      row.status = status;
      return row;
    },
  };
}

function insight(id: number, ruleId: string): Insight {
  return {
    id,
    ruleId,
    severity: "alert",
    title: "título",
    body: "corpo",
    evidence: null,
    periodStart: null,
    periodEnd: null,
    dismissed: false,
    createdAt: "2026-07-21T10:00:00Z",
  };
}

describe("refreshRecommendations", () => {
  it("insere uma recomendação por insight ativo elegível", async () => {
    const goalRepo = createFakeGoalRepository([]);
    const insightRepo = createFakeInsightRepository([insight(1, "acwr_high")]);
    const recommendationRepo = createFakeRecommendationRepository();

    const result = await refreshRecommendations(
      goalRepo,
      insightRepo,
      recommendationRepo,
      "2026-07-21",
    );

    expect(result).toHaveLength(1);
    expect(result[0].insightId).toBe(1);
    expect(recommendationRepo.inserted).toHaveLength(1);
  });

  it("não duplica quando o insight já tem uma recomendação aberta", async () => {
    const goalRepo = createFakeGoalRepository([]);
    const insightRepo = createFakeInsightRepository([insight(1, "acwr_high")]);
    const recommendationRepo = createFakeRecommendationRepository();

    await refreshRecommendations(goalRepo, insightRepo, recommendationRepo, "2026-07-21");
    await refreshRecommendations(goalRepo, insightRepo, recommendationRepo, "2026-07-21");

    expect(recommendationRepo.inserted).toHaveLength(1);
  });

  it("ignora insights sem ação mapeada", async () => {
    const goalRepo = createFakeGoalRepository([]);
    const insightRepo = createFakeInsightRepository([insight(1, "regra_sem_mapeamento")]);
    const recommendationRepo = createFakeRecommendationRepository();

    const result = await refreshRecommendations(
      goalRepo,
      insightRepo,
      recommendationRepo,
      "2026-07-21",
    );

    expect(result).toEqual([]);
  });
});

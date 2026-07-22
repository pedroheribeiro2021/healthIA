import { describe, expect, it } from "vitest";
import type { DailySummary } from "@/domain/analytics";
import type { Goal } from "@/domain/goals";
import type { Insight } from "@/domain/insights";
import type { Recommendation } from "@/domain/recommendations";
import { buildContext } from "./contextBuilder";

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

describe("buildContext", () => {
  it("inclui números reais do resumo diário no system prompt", () => {
    const { system } = buildContext({
      recentSummaries: [summary("2026-07-20", { recoveryScore: 82, sleepDurationS: 27000 })],
      activeGoals: [],
      activeInsights: [],
      openRecommendations: [],
    });

    expect(system).toContain("recovery=82.0");
    expect(system).toContain("sono=7.5h");
  });

  it("inclui metas ativas com direção e prazo", () => {
    const goal: Goal = {
      id: 1,
      metricId: "body.weight.avg7d",
      targetValue: 75,
      direction: "decrease",
      deadline: "2026-12-31",
      active: true,
      createdAt: "2026-07-01T00:00:00.000Z",
    };

    const { system } = buildContext({
      recentSummaries: [],
      activeGoals: [goal],
      activeInsights: [],
      openRecommendations: [],
    });

    expect(system).toContain("body.weight.avg7d: decrease até 75");
    expect(system).toContain("prazo 2026-12-31");
  });

  it("inclui insights com severidade e evidence numérica", () => {
    const insight: Insight = {
      id: 1,
      ruleId: "acwr_high",
      severity: "alert",
      title: "ACWR alto",
      body: "Carga de treino acima do seguro",
      evidence: { acwr: 2.4 },
      periodStart: "2026-07-20T00:00:00.000Z",
      periodEnd: "2026-07-21T00:00:00.000Z",
      dismissed: false,
      createdAt: "2026-07-21T00:00:00.000Z",
    };

    const { system } = buildContext({
      recentSummaries: [],
      activeGoals: [],
      activeInsights: [insight],
      openRecommendations: [],
    });

    expect(system).toContain("[alert] ACWR alto");
    expect(system).toContain('"acwr":2.4');
  });

  it("inclui recomendações abertas", () => {
    const recommendation: Recommendation = {
      id: 1,
      insightId: 1,
      actionType: "reduce_training_load",
      title: "Reduza a carga de treino",
      body: "ACWR está acima de 1.5",
      priority: 1,
      status: "open",
      createdAt: "2026-07-21T00:00:00.000Z",
    };

    const { system } = buildContext({
      recentSummaries: [],
      activeGoals: [],
      activeInsights: [],
      openRecommendations: [recommendation],
    });

    expect(system).toContain("Reduza a carga de treino: ACWR está acima de 1.5");
  });

  it("indica explicitamente quando não há dado em cada seção", () => {
    const { system } = buildContext({
      recentSummaries: [],
      activeGoals: [],
      activeInsights: [],
      openRecommendations: [],
    });

    expect(system).toContain("nenhum dado ainda");
    expect(system).toContain("nenhuma meta ativa");
    expect(system).toContain("nenhum insight ativo");
    expect(system).toContain("nenhuma recomendação aberta");
  });

  it("nunca inclui a palavra 'raw' nem estrutura de evento bruto (só dados já calculados)", () => {
    const { system } = buildContext({
      recentSummaries: [summary("2026-07-20")],
      activeGoals: [],
      activeInsights: [],
      openRecommendations: [],
    });

    expect(system.toLowerCase()).not.toContain("raw_record");
    expect(system.toLowerCase()).not.toContain("health_event");
  });
});

import { describe, expect, it } from "vitest";
import type { Goal } from "@/domain/goals";
import type { Insight, InsightSeverity } from "@/domain/insights";
import { recommend } from "./recommendationPolicy";

function insight(
  id: number,
  ruleId: string,
  severity: InsightSeverity,
  createdAt: string,
): Insight {
  return {
    id,
    ruleId,
    severity,
    title: `título ${ruleId}`,
    body: `corpo ${ruleId}`,
    evidence: null,
    periodStart: null,
    periodEnd: null,
    dismissed: false,
    createdAt,
  };
}

describe("recommend", () => {
  it("mapeia cada ruleId reconhecido pra uma ação determinística", () => {
    const result = recommend(
      [insight(1, "acwr_high", "alert", "2026-07-21T10:00:00Z")],
      [],
    );
    expect(result).toEqual([
      {
        insightId: 1,
        actionType: "reduce_training_load",
        title: "Reduza a carga de treino nos próximos dias",
        body: "corpo acwr_high",
        priority: 1,
      },
    ]);
  });

  it("ignora insights com ruleId sem ação mapeada", () => {
    expect(recommend([insight(1, "regra_desconhecida", "info", "2026-07-21T10:00:00Z")], [])).toEqual([]);
  });

  it("ordena por severidade primeiro (alert antes de attention antes de info)", () => {
    const result = recommend(
      [
        insight(1, "protein_below_target", "info", "2026-07-21T10:00:00Z"),
        insight(2, "acwr_high", "alert", "2026-07-21T10:00:00Z"),
        insight(3, "sleep_regression", "attention", "2026-07-21T10:00:00Z"),
      ],
      [],
    );
    expect(result.map((r) => r.insightId)).toEqual([2, 3, 1]);
  });

  it("prioriza insight relacionado a meta ativa dentro da mesma severidade", () => {
    const goals: Goal[] = [
      { id: 1, metricId: "body.weight.avg7d", targetValue: 80, direction: "decrease", deadline: null, active: true, createdAt: "" },
    ];
    const result = recommend(
      [
        insight(1, "sleep_regression", "attention", "2026-07-21T10:00:00Z"),
        insight(2, "weight_trend_vs_goal", "attention", "2026-07-21T09:00:00Z"),
      ],
      goals,
    );
    expect(result[0].insightId).toBe(2);
  });

  it("limita a 3 recomendações mesmo com mais insights elegíveis", () => {
    const insights = [
      insight(1, "acwr_high", "alert", "2026-07-21T10:00:00Z"),
      insight(2, "sleep_regression", "attention", "2026-07-21T10:00:00Z"),
      insight(3, "consecutive_soccer_recovery", "attention", "2026-07-21T10:00:00Z"),
      insight(4, "protein_below_target", "info", "2026-07-21T10:00:00Z"),
    ];
    const result = recommend(insights, []);
    expect(result).toHaveLength(3);
    expect(result.map((r) => r.priority)).toEqual([1, 2, 3]);
  });
});

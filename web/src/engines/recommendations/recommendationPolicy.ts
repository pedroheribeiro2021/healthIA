import type { Goal } from "@/domain/goals";
import type { Insight, InsightSeverity } from "@/domain/insights";
import type { NewRecommendation } from "@/domain/recommendations";

// "Máx. 3 abertas por dia no dashboard" (docs/ENGINES.md) — quem decide
// quantas aparecem é essa política, não a tabela: recommendationService
// insere só o que sai daqui.
const MAX_RECOMMENDATIONS = 3;

const SEVERITY_RANK: Record<InsightSeverity, number> = {
  alert: 0,
  attention: 1,
  info: 2,
};

type ActionConfig = {
  actionType: string;
  title: string;
  // Se o insight tem uma meta ativa correspondente, a recomendação ganha
  // prioridade — sinal de que o Pedro já disse que aquilo importa pra ele.
  relatedGoalMetricId?: string;
};

const ACTION_BY_RULE: Record<string, ActionConfig> = {
  hrv_drop_after_short_sleep: {
    actionType: "sleep_earlier",
    title: "Durma mais cedo hoje",
  },
  consecutive_soccer_recovery: {
    actionType: "reduce_training_load",
    title: "Considere um dia de descanso",
  },
  weight_trend_vs_goal: {
    actionType: "adjust_nutrition",
    title: "Ajuste o plano em relação à sua meta de peso",
    relatedGoalMetricId: "body.weight.avg7d",
  },
  protein_below_target: {
    actionType: "increase_protein",
    title: "Aumente a ingestão de proteína",
    relatedGoalMetricId: "nutrition.protein.avg7d",
  },
  sleep_regression: {
    actionType: "sleep_earlier",
    title: "Retome sua rotina de sono",
  },
  acwr_high: {
    actionType: "reduce_training_load",
    title: "Reduza a carga de treino nos próximos dias",
  },
  lab_out_of_range: {
    actionType: "consult_doctor",
    title: "Converse com um médico sobre esse exame",
  },
};

// Mapeamento determinístico insight -> ação + priorização (docs/ENGINES.md):
// severidade primeiro, depois relação com meta ativa, depois recência.
// `priority` final é 1..N na ordem resultante (1 = mais importante).
export function recommend(
  insights: Insight[],
  goals: Goal[],
): NewRecommendation[] {
  const candidates = insights
    .map((insight) => {
      const config = ACTION_BY_RULE[insight.ruleId];
      if (!config) return null;
      const relatesToActiveGoal =
        config.relatedGoalMetricId !== undefined &&
        goals.some((g) => g.metricId === config.relatedGoalMetricId);
      return { insight, config, relatesToActiveGoal };
    })
    .filter((c): c is NonNullable<typeof c> => c !== null);

  candidates.sort((a, b) => {
    const severityDiff =
      SEVERITY_RANK[a.insight.severity] - SEVERITY_RANK[b.insight.severity];
    if (severityDiff !== 0) return severityDiff;
    if (a.relatesToActiveGoal !== b.relatesToActiveGoal) {
      return a.relatesToActiveGoal ? -1 : 1;
    }
    return Date.parse(b.insight.createdAt) - Date.parse(a.insight.createdAt);
  });

  return candidates.slice(0, MAX_RECOMMENDATIONS).map((candidate, index) => ({
    insightId: candidate.insight.id,
    actionType: candidate.config.actionType,
    title: candidate.config.title,
    body: candidate.insight.body,
    priority: index + 1,
  }));
}

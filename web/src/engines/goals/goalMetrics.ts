import type { DailySummary } from "@/domain/analytics";
import type { Goal } from "@/domain/goals";
import { mean } from "@/engines/analytics/stats/basic";

type GoalMetricKind = "avg7d" | "latest";

type GoalMetricDef = {
  label: string;
  kind: GoalMetricKind;
  extract: (summary: DailySummary) => number | null;
};

// Conjunto curado de metric_id aceitáveis como meta — só os que dá pra
// calcular "valor atual" a partir de daily_summary (docs/DATA_MODEL.md).
// Não é o catálogo completo do Analytics (engines/analytics/catalog.ts):
// métricas como `sleep.bedtime.avg7d` ou `training.load.acwr` não fazem
// sentido como meta de usuário ou não têm coluna correspondente aqui.
export const GOAL_METRIC_DEFS: Record<string, GoalMetricDef> = {
  "sleep.duration.avg7d": {
    label: "Duração do sono (média 7 dias)",
    kind: "avg7d",
    extract: (s) => s.sleepDurationS,
  },
  "hr.resting.avg7d": {
    label: "FC de repouso (média 7 dias)",
    kind: "avg7d",
    extract: (s) => s.restingHr,
  },
  "hrv.rmssd.avg7d": {
    label: "HRV RMSSD (média 7 dias)",
    kind: "avg7d",
    extract: (s) => s.hrvRmssd,
  },
  "body.weight.avg7d": {
    label: "Peso (média 7 dias)",
    kind: "avg7d",
    extract: (s) => s.weightKg,
  },
  "nutrition.protein.avg7d": {
    label: "Proteína diária (média 7 dias)",
    kind: "avg7d",
    extract: (s) => s.proteinG,
  },
  "recovery.score.daily": {
    label: "Recovery Score (mais recente)",
    kind: "latest",
    extract: (s) => s.recoveryScore,
  },
};

export const GOAL_METRIC_OPTIONS = Object.entries(GOAL_METRIC_DEFS).map(
  ([id, def]) => ({ id, label: def.label }),
);

export function isValidGoalMetricId(id: string): boolean {
  return id in GOAL_METRIC_DEFS;
}

// Valor atual de uma meta a partir do histórico recente de daily_summary.
// `recentSummaries` deve vir ordenado ascendente por dia (mesma convenção
// de MetricRepository.listDailySummaries) e cobrir pelo menos os últimos 7
// dias — quem chama (goalService) é responsável por buscar a janela certa.
export function currentValueForGoal(
  goal: Goal,
  recentSummaries: DailySummary[],
): number | null {
  const def = GOAL_METRIC_DEFS[goal.metricId];
  if (!def) return null;

  if (def.kind === "latest") {
    for (let i = recentSummaries.length - 1; i >= 0; i--) {
      const value = def.extract(recentSummaries[i]);
      if (value !== null) return value;
    }
    return null;
  }

  const last7 = recentSummaries.slice(-7);
  const values = last7
    .map(def.extract)
    .filter((v): v is number => v !== null);
  return values.length > 0 ? mean(values) : null;
}

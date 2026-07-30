import type {
  CorrelationResult,
  DailySummary,
  LocalDay,
  MetricSnapshot,
  TimeSeries,
} from "@/domain/analytics";
import type { Goal } from "@/domain/goals";
import type { Habit, HabitLog } from "@/domain/habits";
import type { HealthEvent } from "@/domain/healthEvent";
import type { NewInsight } from "@/domain/insights";

// Tudo que as regras de insight precisam pra avaliar o dia — montado (com
// I/O) pelo insightService antes de rodar as regras, que em si são puras
// (docs/ENGINES.md: "Nenhum engine chama IA para calcular... TypeScript
// puro, sem I/O nos cálculos").
export type MetricStore = {
  day: LocalDay;
  todaySummary: DailySummary | null;
  // Últimos ~30 dias de daily_summary, ordem ascendente por dia.
  recentDailySummaries: DailySummary[];
  // metric_id -> snapshot mais recente dentro da janela carregada.
  latestMetrics: Record<string, MetricSnapshot | null>;
  // metric_id -> série diária (janela suficiente pra tendência/correlação).
  metricSeries: Record<string, TimeSeries>;
  correlations: CorrelationResult[];
  // Treinos dos últimos dias, ordem ascendente.
  recentWorkouts: HealthEvent[];
  // Exame mais recente por marker (event_type = 'lab_result').
  recentLabResults: HealthEvent[];
  activeGoals: Goal[];
  // Fase 7 (habits): hábitos ativos + logs recentes (~21 dias, suficiente
  // pra streak >=7 e contagem semanal) — usados por habit_streak_broken e
  // stairs_below_target. habit_adherence_drop e weight_plateau_low_adherence
  // não precisam disso: leem habitAdherencePct direto de recentDailySummaries.
  habits: Habit[];
  recentHabitLogs: HabitLog[];
};

export interface InsightRule {
  ruleId: string;
  requiredMetrics: readonly string[];
  evaluate(store: MetricStore): NewInsight | null;
}

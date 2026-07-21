import type {
  DailySummary,
  LocalDay,
  MetricSnapshot,
  NewDailySummary,
  NewMetricSnapshot,
} from "./analytics";
import type { Goal } from "./goals";
import type { EventType, HealthEvent, NewHealthEvent } from "./healthEvent";
import type { Insight, NewInsight } from "./insights";
import type { NewRecommendation, Recommendation } from "./recommendations";
import type { NewRawRecord, RawRecord } from "./rawRecord";

export type InsertRawRecordResult =
  | { status: "accepted"; record: RawRecord }
  | { status: "duplicate" };

/**
 * Única fronteira entre o app e as camadas append-only (raw_records,
 * health_events). Implementação concreta vive em repositories/eventRepository.ts.
 */
export interface EventRepository {
  insertRawRecord(record: NewRawRecord): Promise<InsertRawRecordResult>;
  listPendingRawRecords(limit?: number): Promise<RawRecord[]>;
  markRawRecordNormalized(
    id: number,
    result: { status: "done" } | { status: "error"; error: string },
  ): Promise<void>;

  insertHealthEvents(events: NewHealthEvent[]): Promise<HealthEvent[]>;
  listHealthEvents(params: {
    eventType?: EventType;
    from?: string;
    to?: string;
  }): Promise<HealthEvent[]>;
}

/**
 * Camada derivada e recalculável (docs/DATA_MODEL.md): metric_snapshots +
 * daily_summary. Implementação concreta em repositories/metricRepository.ts.
 */
export interface MetricRepository {
  upsertMetricSnapshots(
    snapshots: NewMetricSnapshot[],
  ): Promise<MetricSnapshot[]>;
  listMetricSnapshots(params: {
    metricId?: string;
    from?: string;
    to?: string;
    algoVersion?: string;
  }): Promise<MetricSnapshot[]>;

  upsertDailySummary(summary: NewDailySummary): Promise<DailySummary>;
  getDailySummary(day: LocalDay): Promise<DailySummary | null>;
  getLatestDailySummary(): Promise<DailySummary | null>;
  listDailySummaries(params: {
    from: LocalDay;
    to: LocalDay;
  }): Promise<DailySummary[]>;
}

/**
 * Leitura de metas (docs/DATA_MODEL.md `goals`). Só o necessário pra Fase 4
 * (regras de insight lerem metas ativas) — criação de metas é Fase 6.
 * Implementação concreta em repositories/goalRepository.ts.
 */
export interface GoalRepository {
  listActiveGoals(): Promise<Goal[]>;
}

/**
 * Camada derivada e recalculável (docs/DATA_MODEL.md `insights`).
 * Implementação concreta em repositories/insightRepository.ts.
 */
export interface InsightRepository {
  insertInsight(insight: NewInsight): Promise<Insight>;
  // Usado pelo insightService pra não duplicar o mesmo insight em
  // recomputes repetidos do mesmo dia (a tabela não tem unique constraint —
  // ver ADR da Fase 4).
  findActiveByRuleAndPeriod(params: {
    ruleId: string;
    periodStart: string;
    periodEnd: string;
  }): Promise<Insight | null>;
  listActive(params: { from: string; to: string }): Promise<Insight[]>;
}

/**
 * Camada derivada e recalculável (docs/DATA_MODEL.md `recommendations`).
 * Implementação concreta em repositories/recommendationRepository.ts.
 */
export interface RecommendationRepository {
  insertRecommendation(
    recommendation: NewRecommendation,
  ): Promise<Recommendation>;
  findOpenByInsightId(insightId: number): Promise<Recommendation | null>;
  listByStatus(status: Recommendation["status"]): Promise<Recommendation[]>;
  updateStatus(
    id: number,
    status: Recommendation["status"],
  ): Promise<Recommendation>;
}

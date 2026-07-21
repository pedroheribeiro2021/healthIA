import type {
  DailySummary,
  LocalDay,
  MetricSnapshot,
  NewDailySummary,
  NewMetricSnapshot,
} from "./analytics";
import type { EventType, HealthEvent, NewHealthEvent } from "./healthEvent";
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

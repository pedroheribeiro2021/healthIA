import type { HealthConnectRecordType } from "./healthConnect";

export type SyncBatchItem = {
  source: "health_connect";
  record_type: string;
  external_id: string | null;
  payload: Record<string, unknown>;
};

// metadata.id é o id do registro na origem (Health Connect) — vira o
// external_id do raw_record no web app, usado pro dedup em
// POST /api/v1/sync/batch (unique(source, external_id)).
export function toSyncBatchItem(
  recordType: HealthConnectRecordType,
  record: Record<string, unknown>,
): SyncBatchItem {
  const metadata = record.metadata as { id?: string } | undefined;
  return {
    source: "health_connect",
    record_type: recordType,
    external_id: metadata?.id ?? null,
    payload: record,
  };
}

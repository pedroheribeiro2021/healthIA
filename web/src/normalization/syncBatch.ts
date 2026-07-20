import type { RawRecordSource } from "@/domain/rawRecord";
import type { EventRepository } from "@/domain/repositories";
import { computePayloadHash } from "./payloadHash";
import { ingestRawRecord } from "./ingest";

export type SyncBatchRecord = {
  source: RawRecordSource;
  recordType: string;
  externalId: string | null;
  payload: Record<string, unknown>;
};

export type SyncBatchResult = {
  accepted: number;
  duplicates: number;
  failed: number;
};

// Protocolo POST /api/v1/sync/batch (docs/ARCHITECTURE.md): idempotente
// por (source, external_id) e por payload_hash. Um registro com erro de
// inserção não derruba o lote inteiro — cada item é isolado.
export async function processSyncBatch(
  repo: EventRepository,
  deviceId: string | null,
  records: SyncBatchRecord[],
): Promise<SyncBatchResult> {
  let accepted = 0;
  let duplicates = 0;
  let failed = 0;

  for (const record of records) {
    try {
      const result = await ingestRawRecord(repo, {
        source: record.source,
        recordType: record.recordType,
        externalId: record.externalId,
        payload: record.payload,
        payloadHash: computePayloadHash(record.payload),
        deviceId,
      });

      if (result.status === "duplicate") {
        duplicates++;
      } else {
        accepted++;
      }
    } catch {
      failed++;
    }
  }

  return { accepted, duplicates, failed };
}

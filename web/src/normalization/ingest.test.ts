import { describe, expect, it } from "vitest";
import type { EventType, HealthEvent, NewHealthEvent } from "@/domain/healthEvent";
import type { NewRawRecord, RawRecord } from "@/domain/rawRecord";
import type {
  EventRepository,
  InsertRawRecordResult,
} from "@/domain/repositories";
import { ingestRawRecord } from "./ingest";

function createFakeRepository(): EventRepository & {
  rawRecords: RawRecord[];
  healthEvents: HealthEvent[];
} {
  const rawRecords: RawRecord[] = [];
  const healthEvents: HealthEvent[] = [];
  let nextRawId = 1;
  let nextEventId = 1;

  return {
    rawRecords,
    healthEvents,

    async insertRawRecord(record: NewRawRecord): Promise<InsertRawRecordResult> {
      const isDuplicate = rawRecords.some(
        (existing) =>
          existing.payloadHash === record.payloadHash ||
          (existing.source === record.source &&
            existing.externalId === record.externalId),
      );
      if (isDuplicate) return { status: "duplicate" };

      const inserted: RawRecord = {
        id: nextRawId++,
        source: record.source,
        recordType: record.recordType,
        externalId: record.externalId,
        payload: record.payload,
        payloadHash: record.payloadHash,
        deviceId: record.deviceId,
        receivedAt: new Date().toISOString(),
        normStatus: "pending",
        normError: null,
      };
      rawRecords.push(inserted);
      return { status: "accepted", record: inserted };
    },

    async listPendingRawRecords(limit = 100): Promise<RawRecord[]> {
      return rawRecords.filter((r) => r.normStatus === "pending").slice(0, limit);
    },

    async markRawRecordNormalized(id, result) {
      const record = rawRecords.find((r) => r.id === id);
      if (!record) return;
      record.normStatus = result.status;
      record.normError = result.status === "error" ? result.error : null;
    },

    async insertHealthEvents(events: NewHealthEvent[]): Promise<HealthEvent[]> {
      const inserted = events.map((event) => ({
        id: nextEventId++,
        supersededBy: null,
        createdAt: new Date().toISOString(),
        ...event,
      }));
      healthEvents.push(...inserted);
      return inserted;
    },

    async listHealthEvents(params: {
      eventType?: EventType;
      from?: string;
      to?: string;
    }): Promise<HealthEvent[]> {
      return healthEvents.filter(
        (e) => !params.eventType || e.eventType === params.eventType,
      );
    },
  };
}

const weightRawRecord: NewRawRecord = {
  source: "manual",
  recordType: "WeightEntry",
  externalId: "hash-1",
  payload: { occurredAt: "2026-07-20T10:00:00.000Z", kg: 82.4 },
  payloadHash: "hash-1",
  deviceId: null,
};

describe("ingestRawRecord", () => {
  it("insere o raw_record, normaliza e grava o health_event correspondente", async () => {
    const repo = createFakeRepository();

    const result = await ingestRawRecord(repo, weightRawRecord);

    expect(result.status).toBe("normalized");
    expect(repo.rawRecords).toHaveLength(1);
    expect(repo.rawRecords[0].normStatus).toBe("done");
    expect(repo.healthEvents).toHaveLength(1);
    expect(repo.healthEvents[0]).toMatchObject({
      eventType: "weight",
      value: 82.4,
      rawRecordId: repo.rawRecords[0].id,
    });
  });

  it("é idempotente: reenviar o mesmo conteúdo retorna duplicate sem novo raw_record", async () => {
    const repo = createFakeRepository();

    await ingestRawRecord(repo, weightRawRecord);
    const second = await ingestRawRecord(repo, weightRawRecord);

    expect(second.status).toBe("duplicate");
    expect(repo.rawRecords).toHaveLength(1);
    expect(repo.healthEvents).toHaveLength(1);
  });

  it("preserva o raw_record e marca erro quando a normalização falha", async () => {
    const repo = createFakeRepository();
    const invalid: NewRawRecord = {
      ...weightRawRecord,
      payload: { occurredAt: "2026-07-20T10:00:00.000Z", kg: "oops" },
      payloadHash: "hash-invalid",
      externalId: "hash-invalid",
    };

    const result = await ingestRawRecord(repo, invalid);

    expect(result.status).toBe("raw_only");
    expect(repo.rawRecords).toHaveLength(1);
    expect(repo.rawRecords[0].normStatus).toBe("error");
    expect(repo.healthEvents).toHaveLength(0);
  });
});

import { describe, expect, it } from "vitest";
import type { HealthEvent, NewHealthEvent } from "@/domain/healthEvent";
import type { NewRawRecord, RawRecord } from "@/domain/rawRecord";
import type {
  EventRepository,
  InsertRawRecordResult,
} from "@/domain/repositories";
import { processSyncBatch, type SyncBatchRecord } from "./syncBatch";

function createFakeRepository(): EventRepository & { rawRecords: RawRecord[] } {
  const rawRecords: RawRecord[] = [];
  let nextRawId = 1;
  let nextEventId = 1;

  return {
    rawRecords,

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

    async listPendingRawRecords(): Promise<RawRecord[]> {
      return rawRecords.filter((r) => r.normStatus === "pending");
    },

    async markRawRecordNormalized(id, result) {
      const record = rawRecords.find((r) => r.id === id);
      if (!record) return;
      record.normStatus = result.status;
      record.normError = result.status === "error" ? result.error : null;
    },

    async insertHealthEvents(events: NewHealthEvent[]): Promise<HealthEvent[]> {
      return events.map((event) => ({
        id: nextEventId++,
        supersededBy: null,
        createdAt: new Date().toISOString(),
        ...event,
      }));
    },

    async listHealthEvents(): Promise<HealthEvent[]> {
      return [];
    },
  };
}

const sleepRecord: SyncBatchRecord = {
  source: "health_connect",
  recordType: "SleepSession",
  externalId: "hc-sleep-1",
  payload: {
    startTime: "2026-07-19T23:00:00.000Z",
    endTime: "2026-07-20T06:00:00.000Z",
  },
};

const invalidRecord: SyncBatchRecord = {
  source: "health_connect",
  recordType: "Weight",
  externalId: "hc-weight-invalid",
  payload: { time: "2026-07-20T07:00:00.000Z" }, // sem "weight" -> normalização falha
};

describe("processSyncBatch", () => {
  it("aceita registros novos e conta duplicados", async () => {
    const repo = createFakeRepository();

    const result = await processSyncBatch(repo, "galaxy-s24-pedro", [
      sleepRecord,
      sleepRecord, // mesmo external_id -> duplicate
    ]);

    expect(result).toEqual({ accepted: 1, duplicates: 1, failed: 0 });
    expect(repo.rawRecords).toHaveLength(1);
    expect(repo.rawRecords[0].deviceId).toBe("galaxy-s24-pedro");
  });

  it("registro com erro de normalização ainda conta como accepted (dado bruto preservado)", async () => {
    const repo = createFakeRepository();

    const result = await processSyncBatch(repo, null, [invalidRecord]);

    expect(result).toEqual({ accepted: 1, duplicates: 0, failed: 0 });
    expect(repo.rawRecords[0].normStatus).toBe("error");
  });

  it("um item que falha na inserção não derruba o restante do lote", async () => {
    const repo = createFakeRepository();
    const originalInsert = repo.insertRawRecord.bind(repo);
    let calls = 0;
    repo.insertRawRecord = async (record) => {
      calls++;
      if (calls === 1) throw new Error("falha de rede simulada");
      return originalInsert(record);
    };

    const result = await processSyncBatch(repo, null, [
      sleepRecord,
      { ...sleepRecord, externalId: "hc-sleep-2" },
    ]);

    expect(result).toEqual({ accepted: 1, duplicates: 0, failed: 1 });
  });

  it("lote vazio retorna zeros", async () => {
    const repo = createFakeRepository();
    const result = await processSyncBatch(repo, null, []);
    expect(result).toEqual({ accepted: 0, duplicates: 0, failed: 0 });
  });
});

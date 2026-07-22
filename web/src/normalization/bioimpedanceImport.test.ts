import { describe, expect, it } from "vitest";
import type { RawRecord } from "@/domain/rawRecord";
import { buildBioimpedanceRawRecord } from "./bioimpedanceImport";
import { normalize } from "./registry";

function rawRecordFrom(overrides: Partial<RawRecord>): RawRecord {
  return {
    id: 1,
    source: "bioimpedance",
    recordType: "BioimpedanceEntry",
    externalId: "hash",
    payload: {},
    payloadHash: "hash",
    deviceId: null,
    receivedAt: "2026-07-20T08:00:00.000Z",
    normStatus: "pending",
    normError: null,
    ...overrides,
  };
}

describe("buildBioimpedanceRawRecord", () => {
  it("mapeia um lançamento de bioimpedância para um raw_record de conteúdo dedupável", () => {
    const record = buildBioimpedanceRawRecord({
      occurredAt: "2026-07-20T08:00:00.000Z",
      kg: 82.4,
      bodyFatPct: 18.5,
    });

    expect(record.source).toBe("bioimpedance");
    expect(record.recordType).toBe("BioimpedanceEntry");
    expect(record.externalId).toBe(record.payloadHash);
  });
});

describe("normalize (registry) — fonte bioimpedance", () => {
  it("normaliza BioimpedanceEntry no mesmo formato do BodyFatRecord do Health Connect", () => {
    const raw = rawRecordFrom({
      payload: {
        occurredAt: "2026-07-20T08:00:00.000Z",
        kg: 82.4,
        bodyFatPct: 18.5,
        leanMassKg: 67.1,
      },
    });

    const [event] = normalize(raw);
    expect(event.eventType).toBe("body_composition");
    expect(event.value).toBe(82.4);
    expect(event.unit).toBe("kg");
    expect(event.detail).toEqual({
      origin: "clinical_bia",
      bodyFatPercentage: 18.5,
      leanMassKg: 67.1,
      waterPercentage: null,
      bmrKcal: null,
    });
  });

  it("normaliza sem os campos opcionais (ficam null)", () => {
    const raw = rawRecordFrom({
      payload: { occurredAt: "2026-07-20T08:00:00.000Z", kg: 82.4 },
    });

    const [event] = normalize(raw);
    expect(event.detail).toEqual({
      origin: "clinical_bia",
      bodyFatPercentage: null,
      leanMassKg: null,
      waterPercentage: null,
      bmrKcal: null,
    });
  });

  it("lança erro para payload inválido, sem derrubar o processo", () => {
    const raw = rawRecordFrom({ payload: { occurredAt: "2026-07-20T08:00:00.000Z" } });
    expect(() => normalize(raw)).toThrow(/payload inválido/);
  });
});

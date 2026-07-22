import { describe, expect, it } from "vitest";
import type { RawRecord } from "@/domain/rawRecord";
import { buildLabImportRawRecord } from "./labImport";
import { normalize } from "./registry";

function rawRecordFrom(overrides: Partial<RawRecord>): RawRecord {
  return {
    id: 1,
    source: "lab",
    recordType: "LabResult",
    externalId: "hash",
    payload: {},
    payloadHash: "hash",
    deviceId: null,
    receivedAt: "2026-07-21T10:00:00.000Z",
    normStatus: "pending",
    normError: null,
    ...overrides,
  };
}

describe("buildLabImportRawRecord", () => {
  it("mapeia um resultado de exame para um raw_record de conteúdo dedupável", () => {
    const record = buildLabImportRawRecord({
      occurredAt: "2026-07-15T09:00:00.000Z",
      marker: "vitamin_d",
      value: 22,
      unit: "ng/mL",
      referenceMin: 30,
      referenceMax: 100,
    });

    expect(record.source).toBe("lab");
    expect(record.recordType).toBe("LabResult");
    expect(record.externalId).toBe(record.payloadHash);
  });
});

describe("normalize (registry) — fonte lab", () => {
  it("normaliza LabResult com faixa de referência em detail", () => {
    const raw = rawRecordFrom({
      payload: {
        occurredAt: "2026-07-15T09:00:00.000Z",
        marker: "vitamin_d",
        value: 22,
        unit: "ng/mL",
        referenceMin: 30,
        referenceMax: 100,
      },
    });

    const [event] = normalize(raw);
    expect(event.eventType).toBe("lab_result");
    expect(event.value).toBe(22);
    expect(event.unit).toBe("ng/mL");
    expect(event.detail).toEqual({
      marker: "vitamin_d",
      referenceRange: { min: 30, max: 100 },
      examFilePath: null,
    });
  });

  it("normaliza sem faixa de referência (min/max ficam null)", () => {
    const raw = rawRecordFrom({
      payload: {
        occurredAt: "2026-07-15T09:00:00.000Z",
        marker: "glucose",
        value: 92,
        unit: "mg/dL",
      },
    });

    const [event] = normalize(raw);
    expect(event.detail).toEqual({
      marker: "glucose",
      referenceRange: { min: null, max: null },
      examFilePath: null,
    });
  });

  it("preserva o caminho do arquivo anexado quando presente", () => {
    const raw = rawRecordFrom({
      payload: {
        occurredAt: "2026-07-15T09:00:00.000Z",
        marker: "glucose",
        value: 92,
        unit: "mg/dL",
        examFilePath: "pedro/2026-07-15-hemograma.pdf",
      },
    });

    const [event] = normalize(raw);
    expect((event.detail as { examFilePath: string }).examFilePath).toBe(
      "pedro/2026-07-15-hemograma.pdf",
    );
  });

  it("lança erro para payload inválido, sem derrubar o processo", () => {
    const raw = rawRecordFrom({
      payload: { occurredAt: "2026-07-15T09:00:00.000Z", marker: "glucose" },
    });

    expect(() => normalize(raw)).toThrow(/payload inválido/);
  });
});

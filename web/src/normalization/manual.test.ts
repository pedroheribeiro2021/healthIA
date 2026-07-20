import { describe, expect, it } from "vitest";
import type { RawRecord } from "@/domain/rawRecord";
import { buildManualRawRecord } from "./manual";
import { normalize } from "./registry";

function rawRecordFrom(overrides: Partial<RawRecord>): RawRecord {
  return {
    id: 1,
    source: "manual",
    recordType: "WeightEntry",
    externalId: "hash",
    payload: {},
    payloadHash: "hash",
    deviceId: null,
    receivedAt: "2026-07-20T10:00:00.000Z",
    normStatus: "pending",
    normError: null,
    ...overrides,
  };
}

describe("buildManualRawRecord", () => {
  it("mapeia um lançamento de peso para um raw_record de conteúdo dedupável", () => {
    const record = buildManualRawRecord({
      type: "weight",
      occurredAt: "2026-07-20T10:00:00.000Z",
      kg: 82.4,
    });

    expect(record.source).toBe("manual");
    expect(record.recordType).toBe("WeightEntry");
    expect(record.payload).toEqual({
      occurredAt: "2026-07-20T10:00:00.000Z",
      kg: 82.4,
    });
    // external_id = payload_hash: reenvio do mesmo conteúdo é duplicate,
    // não um segundo raw_record (unique nulls not distinct (source, external_id)).
    expect(record.externalId).toBe(record.payloadHash);
  });
});

describe("normalize (registry) — fonte manual", () => {
  it("normaliza WeightEntry em um health_event de peso", () => {
    const raw = rawRecordFrom({
      recordType: "WeightEntry",
      payload: { occurredAt: "2026-07-20T10:00:00.000Z", kg: 82.4 },
    });

    const events = normalize(raw);

    expect(events).toEqual([
      {
        eventType: "weight",
        startTime: "2026-07-20T10:00:00.000Z",
        endTime: null,
        value: 82.4,
        unit: "kg",
        detail: null,
        source: "manual",
        rawRecordId: 1,
      },
    ]);
  });

  it("normaliza HydrationEntry em um health_event de hidratação", () => {
    const raw = rawRecordFrom({
      recordType: "HydrationEntry",
      payload: { occurredAt: "2026-07-20T10:00:00.000Z", liters: 0.5 },
    });

    const [event] = normalize(raw);
    expect(event.eventType).toBe("hydration");
    expect(event.value).toBe(0.5);
    expect(event.unit).toBe("l");
  });

  it("normaliza MealEntry preservando macros em detail", () => {
    const raw = rawRecordFrom({
      recordType: "MealEntry",
      payload: {
        occurredAt: "2026-07-20T12:00:00.000Z",
        description: "Frango com arroz",
        mealType: "lunch",
        kcal: 650,
        proteinG: 40,
      },
    });

    const [event] = normalize(raw);
    expect(event.eventType).toBe("meal");
    expect(event.value).toBe(650);
    expect(event.unit).toBe("kcal");
    expect(event.detail).toEqual({
      mealType: "lunch",
      description: "Frango com arroz",
      proteinG: 40,
      carbsG: null,
      fatG: null,
    });
  });

  it("normaliza NoteEntry sem value/unit", () => {
    const raw = rawRecordFrom({
      recordType: "NoteEntry",
      payload: {
        occurredAt: "2026-07-20T12:00:00.000Z",
        text: "Dor no joelho",
      },
    });

    const [event] = normalize(raw);
    expect(event.eventType).toBe("note");
    expect(event.value).toBeNull();
    expect(event.detail).toEqual({ text: "Dor no joelho" });
  });

  it("lança erro para payload inválido, sem derrubar o processo", () => {
    const raw = rawRecordFrom({
      recordType: "WeightEntry",
      payload: { occurredAt: "2026-07-20T10:00:00.000Z", kg: "não é número" },
    });

    expect(() => normalize(raw)).toThrow(/payload inválido/);
  });

  it("lança erro para (source, recordType) sem normalizer registrado", () => {
    const raw = rawRecordFrom({ source: "health_connect", recordType: "SleepSession" });

    expect(() => normalize(raw)).toThrow(/sem normalizer registrado/);
  });
});

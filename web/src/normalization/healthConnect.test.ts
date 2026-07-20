import { describe, expect, it } from "vitest";
import type { RawRecord } from "@/domain/rawRecord";
import { normalize } from "./registry";

function rawRecordFrom(overrides: Partial<RawRecord>): RawRecord {
  return {
    id: 1,
    source: "health_connect",
    recordType: "SleepSession",
    externalId: "hc-uuid-1",
    payload: {},
    payloadHash: "hash",
    deviceId: "galaxy-s24-pedro",
    receivedAt: "2026-07-20T10:00:00.000Z",
    normStatus: "pending",
    normError: null,
    ...overrides,
  };
}

describe("normalize — fonte health_connect", () => {
  it("normaliza SleepSession somando a duração de cada estágio", () => {
    const raw = rawRecordFrom({
      recordType: "SleepSession",
      payload: {
        startTime: "2026-07-19T23:30:00.000Z",
        endTime: "2026-07-20T06:45:00.000Z",
        stages: [
          {
            startTime: "2026-07-19T23:30:00.000Z",
            endTime: "2026-07-20T01:00:00.000Z",
            stage: 4, // light
          },
          {
            startTime: "2026-07-20T01:00:00.000Z",
            endTime: "2026-07-20T02:30:00.000Z",
            stage: 5, // deep
          },
          {
            startTime: "2026-07-20T02:30:00.000Z",
            endTime: "2026-07-20T03:00:00.000Z",
            stage: 6, // rem
          },
        ],
      },
    });

    const [event] = normalize(raw);
    expect(event.eventType).toBe("sleep_session");
    expect(event.value).toBeCloseTo(7.25 * 3600);
    expect(event.unit).toBe("s");
    expect(event.detail).toEqual({
      deepS: 5400,
      remS: 1800,
      lightS: 5400,
      awakeS: null,
    });
  });

  it("normaliza ExerciseSession mapeando exerciseType para sport", () => {
    const raw = rawRecordFrom({
      recordType: "ExerciseSession",
      payload: {
        startTime: "2026-07-20T18:00:00.000Z",
        endTime: "2026-07-20T19:30:00.000Z",
        exerciseType: 64, // soccer
        title: "Futebol quinta",
      },
    });

    const [event] = normalize(raw);
    expect(event.eventType).toBe("workout");
    expect(event.value).toBe(5400);
    expect(event.detail).toEqual({ sport: "soccer", title: "Futebol quinta" });
  });

  it("mapeia exerciseType desconhecido para 'other' em vez de falhar", () => {
    const raw = rawRecordFrom({
      recordType: "ExerciseSession",
      payload: {
        startTime: "2026-07-20T18:00:00.000Z",
        endTime: "2026-07-20T19:00:00.000Z",
        exerciseType: 9999,
      },
    });

    const [event] = normalize(raw);
    expect(event.detail).toMatchObject({ sport: "other" });
  });

  it("normaliza HeartRate expandindo cada amostra em um health_event", () => {
    const raw = rawRecordFrom({
      recordType: "HeartRate",
      payload: {
        startTime: "2026-07-20T18:00:00.000Z",
        endTime: "2026-07-20T18:01:00.000Z",
        samples: [
          { time: "2026-07-20T18:00:00.000Z", beatsPerMinute: 140 },
          { time: "2026-07-20T18:00:30.000Z", beatsPerMinute: 145 },
        ],
      },
    });

    const events = normalize(raw);
    expect(events).toHaveLength(2);
    expect(events[0]).toMatchObject({
      eventType: "heart_rate",
      startTime: "2026-07-20T18:00:00.000Z",
      value: 140,
      unit: "bpm",
    });
    expect(events[1].value).toBe(145);
  });

  it("normaliza HeartRateVariabilityRmssd", () => {
    const raw = rawRecordFrom({
      recordType: "HeartRateVariabilityRmssd",
      payload: {
        time: "2026-07-20T07:00:00.000Z",
        heartRateVariabilityMillis: 45.2,
      },
    });

    const [event] = normalize(raw);
    expect(event.eventType).toBe("hrv");
    expect(event.value).toBe(45.2);
    expect(event.unit).toBe("ms");
  });

  it("normaliza Steps", () => {
    const raw = rawRecordFrom({
      recordType: "Steps",
      payload: {
        startTime: "2026-07-20T00:00:00.000Z",
        endTime: "2026-07-20T23:59:59.000Z",
        count: 8342,
      },
    });

    const [event] = normalize(raw);
    expect(event.eventType).toBe("steps");
    expect(event.value).toBe(8342);
  });

  it("normaliza Weight convertendo gramas para kg", () => {
    const raw = rawRecordFrom({
      recordType: "Weight",
      payload: {
        time: "2026-07-20T07:00:00.000Z",
        weight: { value: 82400, unit: "grams" },
      },
    });

    const [event] = normalize(raw);
    expect(event.eventType).toBe("weight");
    expect(event.value).toBeCloseTo(82.4);
    expect(event.unit).toBe("kg");
  });

  it("normaliza BodyFat em body_composition sem value/unit", () => {
    const raw = rawRecordFrom({
      recordType: "BodyFat",
      payload: { time: "2026-07-20T07:00:00.000Z", percentage: 18.5 },
    });

    const [event] = normalize(raw);
    expect(event.eventType).toBe("body_composition");
    expect(event.value).toBeNull();
    expect(event.detail).toEqual({ origin: "watch", bodyFatPercentage: 18.5 });
  });

  it("normaliza Hydration convertendo mililitros para litros", () => {
    const raw = rawRecordFrom({
      recordType: "Hydration",
      payload: {
        startTime: "2026-07-20T10:00:00.000Z",
        endTime: "2026-07-20T10:00:00.000Z",
        volume: { value: 500, unit: "milliliters" },
      },
    });

    const [event] = normalize(raw);
    expect(event.eventType).toBe("hydration");
    expect(event.value).toBeCloseTo(0.5);
    expect(event.unit).toBe("l");
  });

  it("normaliza Nutrition convertendo energia/macros para SI", () => {
    const raw = rawRecordFrom({
      recordType: "Nutrition",
      payload: {
        startTime: "2026-07-20T12:00:00.000Z",
        endTime: "2026-07-20T12:00:00.000Z",
        mealType: 2, // lunch
        name: "Frango com arroz",
        energy: { value: 650, unit: "kilocalories" },
        protein: { value: 40, unit: "grams" },
      },
    });

    const [event] = normalize(raw);
    expect(event.eventType).toBe("meal");
    expect(event.value).toBe(650);
    expect(event.detail).toMatchObject({
      mealType: "lunch",
      description: "Frango com arroz",
      proteinG: 40,
    });
  });

  it("lança erro para payload de health_connect inválido", () => {
    const raw = rawRecordFrom({
      recordType: "Weight",
      payload: { time: "2026-07-20T07:00:00.000Z" },
    });

    expect(() => normalize(raw)).toThrow(/payload inválido/);
  });
});

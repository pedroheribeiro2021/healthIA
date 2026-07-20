import type { z } from "zod";
import {
  bodyFatPayloadSchema,
  exerciseSessionPayloadSchema,
  heartRatePayloadSchema,
  hrvPayloadSchema,
  hydrationPayloadSchema,
  nutritionPayloadSchema,
  sleepSessionPayloadSchema,
  stepsPayloadSchema,
  weightPayloadSchema,
} from "@/domain/healthConnect";
import type { MealType } from "@/domain/manualEntry";
import type { NewHealthEvent } from "@/domain/healthEvent";
import type { RawRecord } from "@/domain/rawRecord";
import { energyToKcal, massToGrams, massToKg, volumeToLiters } from "./units";

function parsePayload<T>(raw: RawRecord, schema: z.ZodType<T>): T {
  const parsed = schema.safeParse(raw.payload);
  if (!parsed.success) {
    throw new Error(
      `payload inválido para ${raw.source}:${raw.recordType}: ${parsed.error.message}`,
    );
  }
  return parsed.data;
}

// stage numérico -> rótulo (react-native-health-connect: SleepStageType).
const SLEEP_STAGE_LABELS: Record<number, string> = {
  0: "unknown",
  1: "awake",
  2: "sleeping",
  3: "outOfBed",
  4: "light",
  5: "deep",
  6: "rem",
};

export function normalizeSleepSession(raw: RawRecord): NewHealthEvent[] {
  const data = parsePayload(raw, sleepSessionPayloadSchema);
  const durationS =
    (Date.parse(data.endTime) - Date.parse(data.startTime)) / 1000;

  const stageSecondsByLabel: Record<string, number> = {};
  for (const stage of data.stages ?? []) {
    const label = SLEEP_STAGE_LABELS[stage.stage] ?? "unknown";
    const seconds = (Date.parse(stage.endTime) - Date.parse(stage.startTime)) / 1000;
    stageSecondsByLabel[label] = (stageSecondsByLabel[label] ?? 0) + seconds;
  }

  return [
    {
      eventType: "sleep_session",
      startTime: data.startTime,
      endTime: data.endTime,
      value: durationS,
      unit: "s",
      detail: {
        deepS: stageSecondsByLabel.deep ?? null,
        remS: stageSecondsByLabel.rem ?? null,
        lightS: stageSecondsByLabel.light ?? null,
        awakeS: stageSecondsByLabel.awake ?? null,
      },
      source: raw.source,
      rawRecordId: raw.id,
    },
  ];
}

// exerciseType numérico -> sport (react-native-health-connect: ExerciseType).
// Subconjunto documentado no DATA_MODEL ('soccer'|'gym'|'run'|...); tipos
// não mapeados caem em 'other' em vez de falhar a normalização.
const EXERCISE_TYPE_TO_SPORT: Record<string, number[]> = {
  run: [56, 57],
  soccer: [64],
  walk: [79],
  bike: [8, 9],
  gym: [70, 81, 17, 6, 3, 67],
};
const EXERCISE_TYPE_LABELS: Record<number, string> = Object.fromEntries(
  Object.entries(EXERCISE_TYPE_TO_SPORT).flatMap(([sport, codes]) =>
    codes.map((code) => [code, sport]),
  ),
);

export function normalizeExerciseSession(raw: RawRecord): NewHealthEvent[] {
  const data = parsePayload(raw, exerciseSessionPayloadSchema);
  const durationS =
    (Date.parse(data.endTime) - Date.parse(data.startTime)) / 1000;

  return [
    {
      eventType: "workout",
      startTime: data.startTime,
      endTime: data.endTime,
      value: durationS,
      unit: "s",
      detail: {
        sport: EXERCISE_TYPE_LABELS[data.exerciseType] ?? "other",
        title: data.title ?? null,
      },
      source: raw.source,
      rawRecordId: raw.id,
    },
  ];
}

// Um HeartRateRecord do Health Connect é uma sessão de monitoramento
// contínuo com várias amostras — cada amostra vira seu próprio
// health_event (todos referenciando o mesmo raw_record).
export function normalizeHeartRate(raw: RawRecord): NewHealthEvent[] {
  const data = parsePayload(raw, heartRatePayloadSchema);
  return data.samples.map((sample) => ({
    eventType: "heart_rate",
    startTime: sample.time,
    endTime: null,
    value: sample.beatsPerMinute,
    unit: "bpm",
    detail: { context: "continuous" },
    source: raw.source,
    rawRecordId: raw.id,
  }));
}

export function normalizeHrv(raw: RawRecord): NewHealthEvent[] {
  const data = parsePayload(raw, hrvPayloadSchema);
  return [
    {
      eventType: "hrv",
      startTime: data.time,
      endTime: null,
      value: data.heartRateVariabilityMillis,
      unit: "ms",
      detail: { method: "rmssd" },
      source: raw.source,
      rawRecordId: raw.id,
    },
  ];
}

export function normalizeSteps(raw: RawRecord): NewHealthEvent[] {
  const data = parsePayload(raw, stepsPayloadSchema);
  return [
    {
      eventType: "steps",
      startTime: data.startTime,
      endTime: data.endTime,
      value: data.count,
      unit: "count",
      detail: null,
      source: raw.source,
      rawRecordId: raw.id,
    },
  ];
}

export function normalizeWeight(raw: RawRecord): NewHealthEvent[] {
  const data = parsePayload(raw, weightPayloadSchema);
  return [
    {
      eventType: "weight",
      startTime: data.time,
      endTime: null,
      value: massToKg(data.weight),
      unit: "kg",
      detail: null,
      source: raw.source,
      rawRecordId: raw.id,
    },
  ];
}

// Health Connect só expõe % de gordura (BodyFatRecord), não a composição
// clínica completa (massa magra, água, TMB) — isso vem de bioimpedância
// importada na Fase 5. value/unit ficam null; peso já chega separado via
// WeightRecord (evento 'weight').
export function normalizeBodyFat(raw: RawRecord): NewHealthEvent[] {
  const data = parsePayload(raw, bodyFatPayloadSchema);
  return [
    {
      eventType: "body_composition",
      startTime: data.time,
      endTime: null,
      value: null,
      unit: null,
      detail: { origin: "watch", bodyFatPercentage: data.percentage },
      source: raw.source,
      rawRecordId: raw.id,
    },
  ];
}

export function normalizeHydration(raw: RawRecord): NewHealthEvent[] {
  const data = parsePayload(raw, hydrationPayloadSchema);
  return [
    {
      eventType: "hydration",
      startTime: data.startTime,
      endTime: data.endTime,
      value: volumeToLiters(data.volume),
      unit: "l",
      detail: null,
      source: raw.source,
      rawRecordId: raw.id,
    },
  ];
}

// mealType numérico -> rótulo (react-native-health-connect: MealType).
const MEAL_TYPE_LABELS: Record<number, MealType> = {
  0: "other",
  1: "breakfast",
  2: "lunch",
  3: "dinner",
  4: "snack",
};

export function normalizeNutrition(raw: RawRecord): NewHealthEvent[] {
  const data = parsePayload(raw, nutritionPayloadSchema);
  const kcal = data.energy ? energyToKcal(data.energy) : null;

  return [
    {
      eventType: "meal",
      startTime: data.startTime,
      endTime: data.endTime,
      value: kcal,
      unit: kcal != null ? "kcal" : null,
      detail: {
        mealType: MEAL_TYPE_LABELS[data.mealType ?? 0] ?? "other",
        description: data.name ?? null,
        proteinG: data.protein ? massToGrams(data.protein) : null,
        carbsG: data.totalCarbohydrate ? massToGrams(data.totalCarbohydrate) : null,
        fatG: data.totalFat ? massToGrams(data.totalFat) : null,
      },
      source: raw.source,
      rawRecordId: raw.id,
    },
  ];
}

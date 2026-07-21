import { z } from "zod";
import { isoDateTimeSchema as isoDateTime } from "./shared";

// Espelha os tipos de registro do react-native-health-connect (fonte:
// src/types/{records,base,metadata}.types.ts da lib). `metadata` é
// passthrough porque a lib inclui campos que não usamos (device,
// recordingMethod, clientRecordVersion); só `metadata.id` importa aqui
// (vira o external_id do raw_record — id do registro na origem).
const metadataSchema = z
  .object({
    id: z.string().nullable().optional(),
    dataOrigin: z.string().nullable().optional(),
    lastModifiedTime: z.string().nullable().optional(),
    clientRecordId: z.string().nullable().optional(),
  })
  .passthrough();

export const massSchema = z.object({
  value: z.number(),
  unit: z.enum([
    "grams",
    "kilograms",
    "milligrams",
    "micrograms",
    "ounces",
    "pounds",
  ]),
});
export type Mass = z.infer<typeof massSchema>;

export const volumeSchema = z.object({
  value: z.number(),
  unit: z.enum(["liters", "fluidOuncesUs", "milliliters"]),
});
export type Volume = z.infer<typeof volumeSchema>;

export const energySchema = z.object({
  value: z.number(),
  unit: z.enum(["calories", "joules", "kilocalories", "kilojoules"]),
});
export type Energy = z.infer<typeof energySchema>;

const sleepStageSchema = z.object({
  startTime: isoDateTime,
  endTime: isoDateTime,
  stage: z.number(),
});

export const sleepSessionPayloadSchema = z.object({
  metadata: metadataSchema.optional(),
  startTime: isoDateTime,
  endTime: isoDateTime,
  stages: z.array(sleepStageSchema).optional(),
  title: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});
export type SleepSessionPayload = z.infer<typeof sleepSessionPayloadSchema>;

const exerciseSegmentSchema = z.object({
  startTime: isoDateTime,
  endTime: isoDateTime,
  segmentType: z.number(),
  repetitions: z.number().optional(),
});

export const exerciseSessionPayloadSchema = z.object({
  metadata: metadataSchema.optional(),
  startTime: isoDateTime,
  endTime: isoDateTime,
  exerciseType: z.number(),
  title: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  segments: z.array(exerciseSegmentSchema).optional(),
});
export type ExerciseSessionPayload = z.infer<
  typeof exerciseSessionPayloadSchema
>;

const heartRateSampleSchema = z.object({
  time: isoDateTime,
  beatsPerMinute: z.number(),
});

export const heartRatePayloadSchema = z.object({
  metadata: metadataSchema.optional(),
  startTime: isoDateTime,
  endTime: isoDateTime,
  samples: z.array(heartRateSampleSchema).min(1),
});
export type HeartRatePayload = z.infer<typeof heartRatePayloadSchema>;

export const hrvPayloadSchema = z.object({
  metadata: metadataSchema.optional(),
  time: isoDateTime,
  heartRateVariabilityMillis: z.number(),
});
export type HrvPayload = z.infer<typeof hrvPayloadSchema>;

export const stepsPayloadSchema = z.object({
  metadata: metadataSchema.optional(),
  startTime: isoDateTime,
  endTime: isoDateTime,
  count: z.number(),
});
export type StepsPayload = z.infer<typeof stepsPayloadSchema>;

export const weightPayloadSchema = z.object({
  metadata: metadataSchema.optional(),
  time: isoDateTime,
  weight: massSchema,
});
export type WeightPayload = z.infer<typeof weightPayloadSchema>;

export const bodyFatPayloadSchema = z.object({
  metadata: metadataSchema.optional(),
  time: isoDateTime,
  percentage: z.number(),
});
export type BodyFatPayload = z.infer<typeof bodyFatPayloadSchema>;

export const hydrationPayloadSchema = z.object({
  metadata: metadataSchema.optional(),
  startTime: isoDateTime,
  endTime: isoDateTime,
  volume: volumeSchema,
});
export type HydrationPayload = z.infer<typeof hydrationPayloadSchema>;

export const nutritionPayloadSchema = z.object({
  metadata: metadataSchema.optional(),
  startTime: isoDateTime,
  endTime: isoDateTime,
  mealType: z.number().nullable().optional(),
  name: z.string().nullable().optional(),
  energy: energySchema.optional(),
  protein: massSchema.optional(),
  totalCarbohydrate: massSchema.optional(),
  totalFat: massSchema.optional(),
});
export type NutritionPayload = z.infer<typeof nutritionPayloadSchema>;

// record_type gravado em raw_records para cada tipo lido do Health
// Connect — mesmos nomes de `recordType` da lib (registry.ts resolve por
// "health_connect:<este valor>").
export const HEALTH_CONNECT_RECORD_TYPES = [
  "SleepSession",
  "ExerciseSession",
  "HeartRate",
  "HeartRateVariabilityRmssd",
  "Steps",
  "Weight",
  "BodyFat",
  "Hydration",
  "Nutrition",
] as const;
export type HealthConnectRecordType =
  (typeof HEALTH_CONNECT_RECORD_TYPES)[number];

import { z } from "zod";

export const eventTypeSchema = z.enum([
  "sleep_session",
  "workout",
  "heart_rate",
  "resting_heart_rate",
  "hrv",
  "steps",
  "weight",
  "body_composition",
  "hydration",
  "meal",
  "lab_result",
  "note",
]);
export type EventType = z.infer<typeof eventTypeSchema>;

export const healthEventSchema = z.object({
  id: z.number(),
  eventType: eventTypeSchema,
  startTime: z.string(),
  endTime: z.string().nullable(),
  value: z.number().nullable(),
  unit: z.string().nullable(),
  detail: z.record(z.string(), z.unknown()).nullable(),
  source: z.string(),
  rawRecordId: z.number().nullable(),
  supersededBy: z.number().nullable(),
  createdAt: z.string(),
});
export type HealthEvent = z.infer<typeof healthEventSchema>;

export const newHealthEventSchema = healthEventSchema.omit({
  id: true,
  supersededBy: true,
  createdAt: true,
});
export type NewHealthEvent = z.infer<typeof newHealthEventSchema>;

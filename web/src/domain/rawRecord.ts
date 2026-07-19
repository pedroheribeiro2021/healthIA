import { z } from "zod";

export const rawRecordSourceSchema = z.enum([
  "health_connect",
  "manual",
  "bioimpedance",
  "lab",
  "recipe_import",
]);
export type RawRecordSource = z.infer<typeof rawRecordSourceSchema>;

export const normStatusSchema = z.enum(["pending", "done", "error"]);
export type NormStatus = z.infer<typeof normStatusSchema>;

export const rawRecordSchema = z.object({
  id: z.number(),
  source: rawRecordSourceSchema,
  recordType: z.string(),
  externalId: z.string().nullable(),
  payload: z.record(z.string(), z.unknown()),
  payloadHash: z.string(),
  deviceId: z.string().nullable(),
  receivedAt: z.string(),
  normStatus: normStatusSchema,
  normError: z.string().nullable(),
});
export type RawRecord = z.infer<typeof rawRecordSchema>;

export const newRawRecordSchema = rawRecordSchema.omit({
  id: true,
  receivedAt: true,
  normStatus: true,
  normError: true,
});
export type NewRawRecord = z.infer<typeof newRawRecordSchema>;

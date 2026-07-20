import { z } from "zod";

const isoDateTime = z
  .string()
  .refine((value) => !Number.isNaN(Date.parse(value)), "Data/hora inválida");

export const mealTypeSchema = z.enum([
  "breakfast",
  "lunch",
  "dinner",
  "snack",
  "other",
]);
export type MealType = z.infer<typeof mealTypeSchema>;

export const weightEntryPayloadSchema = z.object({
  occurredAt: isoDateTime,
  kg: z.number().positive().max(400),
});
export type WeightEntryPayload = z.infer<typeof weightEntryPayloadSchema>;

export const hydrationEntryPayloadSchema = z.object({
  occurredAt: isoDateTime,
  liters: z.number().positive().max(10),
});
export type HydrationEntryPayload = z.infer<typeof hydrationEntryPayloadSchema>;

export const mealEntryPayloadSchema = z.object({
  occurredAt: isoDateTime,
  description: z.string().min(1).max(200),
  mealType: mealTypeSchema.default("other"),
  kcal: z.number().nonnegative().max(10000).optional(),
  proteinG: z.number().nonnegative().max(1000).optional(),
  carbsG: z.number().nonnegative().max(1000).optional(),
  fatG: z.number().nonnegative().max(1000).optional(),
});
export type MealEntryPayload = z.infer<typeof mealEntryPayloadSchema>;

export const noteEntryPayloadSchema = z.object({
  occurredAt: isoDateTime,
  text: z.string().min(1).max(2000),
});
export type NoteEntryPayload = z.infer<typeof noteEntryPayloadSchema>;

// Mapeia o tipo de lançamento manual para o record_type gravado em
// raw_records (ver normalization/registry.ts, que faz o caminho inverso).
export const MANUAL_RECORD_TYPES = {
  weight: "WeightEntry",
  hydration: "HydrationEntry",
  meal: "MealEntry",
  note: "NoteEntry",
} as const;
export type ManualEntryType = keyof typeof MANUAL_RECORD_TYPES;

export function manualRecordTypeFor(type: ManualEntryType): string {
  return MANUAL_RECORD_TYPES[type];
}

export const manualEntryInputSchema = z.discriminatedUnion("type", [
  weightEntryPayloadSchema.extend({ type: z.literal("weight") }),
  hydrationEntryPayloadSchema.extend({ type: z.literal("hydration") }),
  mealEntryPayloadSchema.extend({ type: z.literal("meal") }),
  noteEntryPayloadSchema.extend({ type: z.literal("note") }),
]);
export type ManualEntryInput = z.infer<typeof manualEntryInputSchema>;

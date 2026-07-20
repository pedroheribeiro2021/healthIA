import type { z } from "zod";
import type { NewHealthEvent } from "@/domain/healthEvent";
import {
  hydrationEntryPayloadSchema,
  manualRecordTypeFor,
  mealEntryPayloadSchema,
  noteEntryPayloadSchema,
  weightEntryPayloadSchema,
  type ManualEntryInput,
} from "@/domain/manualEntry";
import type { NewRawRecord } from "@/domain/rawRecord";
import type { RawRecord } from "@/domain/rawRecord";
import { computePayloadHash } from "./payloadHash";

// Um lançamento manual dedup por conteúdo: o mesmo (occurredAt + valores)
// reenviado (ex.: retry de rede) deve cair no unique(payload_hash)/unique
// (source, external_id) em vez de criar um raw_record duplicado. Por isso
// external_id = payload_hash em vez de um id gerado por request.
export function buildManualRawRecord(entry: ManualEntryInput): NewRawRecord {
  const { type, ...payload } = entry;
  const payloadHash = computePayloadHash(payload);

  return {
    source: "manual",
    recordType: manualRecordTypeFor(type),
    externalId: payloadHash,
    payload,
    payloadHash,
    deviceId: null,
  };
}

function parsePayload<T>(raw: RawRecord, schema: z.ZodType<T>): T {
  const parsed = schema.safeParse(raw.payload);
  if (!parsed.success) {
    throw new Error(
      `payload inválido para ${raw.source}:${raw.recordType}: ${parsed.error.message}`,
    );
  }
  return parsed.data;
}

export function normalizeWeightEntry(raw: RawRecord): NewHealthEvent[] {
  const { occurredAt, kg } = parsePayload(raw, weightEntryPayloadSchema);
  return [
    {
      eventType: "weight",
      startTime: occurredAt,
      endTime: null,
      value: kg,
      unit: "kg",
      detail: null,
      source: raw.source,
      rawRecordId: raw.id,
    },
  ];
}

export function normalizeHydrationEntry(raw: RawRecord): NewHealthEvent[] {
  const { occurredAt, liters } = parsePayload(raw, hydrationEntryPayloadSchema);
  return [
    {
      eventType: "hydration",
      startTime: occurredAt,
      endTime: null,
      value: liters,
      unit: "l",
      detail: null,
      source: raw.source,
      rawRecordId: raw.id,
    },
  ];
}

export function normalizeMealEntry(raw: RawRecord): NewHealthEvent[] {
  const { occurredAt, description, mealType, kcal, proteinG, carbsG, fatG } =
    parsePayload(raw, mealEntryPayloadSchema);
  return [
    {
      eventType: "meal",
      startTime: occurredAt,
      endTime: null,
      value: kcal ?? null,
      unit: kcal != null ? "kcal" : null,
      detail: {
        mealType,
        description,
        proteinG: proteinG ?? null,
        carbsG: carbsG ?? null,
        fatG: fatG ?? null,
      },
      source: raw.source,
      rawRecordId: raw.id,
    },
  ];
}

export function normalizeNoteEntry(raw: RawRecord): NewHealthEvent[] {
  const { occurredAt, text } = parsePayload(raw, noteEntryPayloadSchema);
  return [
    {
      eventType: "note",
      startTime: occurredAt,
      endTime: null,
      value: null,
      unit: null,
      detail: { text },
      source: raw.source,
      rawRecordId: raw.id,
    },
  ];
}

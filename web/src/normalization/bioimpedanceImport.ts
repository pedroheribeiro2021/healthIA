import type { NewHealthEvent } from "@/domain/healthEvent";
import {
  bioimpedanceInputSchema,
  type BioimpedanceInput,
} from "@/domain/bioimpedance";
import type { NewRawRecord, RawRecord } from "@/domain/rawRecord";
import { computePayloadHash } from "./payloadHash";

export function buildBioimpedanceRawRecord(input: BioimpedanceInput): NewRawRecord {
  const payloadHash = computePayloadHash(input);
  return {
    source: "bioimpedance",
    recordType: "BioimpedanceEntry",
    externalId: payloadHash,
    payload: input,
    payloadHash,
    deviceId: null,
  };
}

// Espelha o formato do detail já usado pelo BodyFatRecord do Health Connect
// (normalization/healthConnect.ts: `detail.origin`/`detail.bodyFatPercentage`)
// pra as duas fontes ficarem comparáveis na mesma forma.
export function normalizeBioimpedanceEntry(raw: RawRecord): NewHealthEvent[] {
  const parsed = bioimpedanceInputSchema.safeParse(raw.payload);
  if (!parsed.success) {
    throw new Error(
      `payload inválido para ${raw.source}:${raw.recordType}: ${parsed.error.message}`,
    );
  }
  const { occurredAt, kg, bodyFatPct, leanMassKg, waterPct, bmrKcal } = parsed.data;

  return [
    {
      eventType: "body_composition",
      startTime: occurredAt,
      endTime: null,
      value: kg,
      unit: "kg",
      detail: {
        origin: "clinical_bia",
        bodyFatPercentage: bodyFatPct ?? null,
        leanMassKg: leanMassKg ?? null,
        waterPercentage: waterPct ?? null,
        bmrKcal: bmrKcal ?? null,
      },
      source: raw.source,
      rawRecordId: raw.id,
    },
  ];
}

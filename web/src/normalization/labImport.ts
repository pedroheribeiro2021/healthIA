import type { NewHealthEvent } from "@/domain/healthEvent";
import { labResultInputSchema, type LabResultInput } from "@/domain/labResult";
import type { NewRawRecord, RawRecord } from "@/domain/rawRecord";
import { computePayloadHash } from "./payloadHash";

// Dedup por conteúdo, mesmo padrão de normalization/manual.ts — reenviar o
// mesmo exame (mesmo marker+valor+data) cai em duplicate, não em um segundo
// raw_record.
export function buildLabImportRawRecord(input: LabResultInput): NewRawRecord {
  const payloadHash = computePayloadHash(input);
  return {
    source: "lab",
    recordType: "LabResult",
    externalId: payloadHash,
    payload: input,
    payloadHash,
    deviceId: null,
  };
}

export function normalizeLabResult(raw: RawRecord): NewHealthEvent[] {
  const parsed = labResultInputSchema.safeParse(raw.payload);
  if (!parsed.success) {
    throw new Error(
      `payload inválido para ${raw.source}:${raw.recordType}: ${parsed.error.message}`,
    );
  }
  const { occurredAt, marker, value, unit, referenceMin, referenceMax, examFilePath } =
    parsed.data;

  return [
    {
      eventType: "lab_result",
      startTime: occurredAt,
      endTime: null,
      value,
      unit,
      detail: {
        marker,
        referenceRange: { min: referenceMin ?? null, max: referenceMax ?? null },
        examFilePath: examFilePath ?? null,
      },
      source: raw.source,
      rawRecordId: raw.id,
    },
  ];
}

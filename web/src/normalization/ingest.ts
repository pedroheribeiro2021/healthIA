import type { HealthEvent, NewHealthEvent } from "@/domain/healthEvent";
import type { NewRawRecord } from "@/domain/rawRecord";
import type { EventRepository } from "@/domain/repositories";
import { normalize } from "./registry";

export type IngestResult =
  | { status: "duplicate" }
  | { status: "normalized"; rawRecordId: number; events: HealthEvent[] }
  | { status: "raw_only"; rawRecordId: number; error: string };

// Pipeline completa raw_records -> Normalization -> health_events
// (docs/ARCHITECTURE.md). Erro de normalização não descarta o dado bruto:
// o raw_record fica com norm_status='error', pronto para reprocesso
// (rota admin da Fase 2+), coerente com "dado bruto nunca é perdido".
export async function ingestRawRecord(
  repo: EventRepository,
  input: NewRawRecord,
): Promise<IngestResult> {
  const inserted = await repo.insertRawRecord(input);
  if (inserted.status === "duplicate") {
    return { status: "duplicate" };
  }

  const rawRecord = inserted.record;

  let newEvents: NewHealthEvent[];
  try {
    newEvents = normalize(rawRecord);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await repo.markRawRecordNormalized(rawRecord.id, {
      status: "error",
      error: message,
    });
    return { status: "raw_only", rawRecordId: rawRecord.id, error: message };
  }

  const events = await repo.insertHealthEvents(newEvents);
  await repo.markRawRecordNormalized(rawRecord.id, { status: "done" });
  return { status: "normalized", rawRecordId: rawRecord.id, events };
}

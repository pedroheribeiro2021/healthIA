import type { HealthEvent, NewHealthEvent } from "@/domain/healthEvent";
import type {
  EventRepository,
  InsertRawRecordResult,
} from "@/domain/repositories";
import type { NewRawRecord, RawRecord } from "@/domain/rawRecord";
import type { Json } from "./supabase/databaseTypes";
import { createSupabaseServerClient } from "./supabase/serverClient";

const UNIQUE_VIOLATION = "23505";

function toRawRecord(row: {
  id: number;
  source: string;
  record_type: string;
  external_id: string | null;
  payload: unknown;
  payload_hash: string;
  device_id: string | null;
  received_at: string;
  norm_status: string;
  norm_error: string | null;
}): RawRecord {
  return {
    id: row.id,
    source: row.source as RawRecord["source"],
    recordType: row.record_type,
    externalId: row.external_id,
    payload: row.payload as Record<string, unknown>,
    payloadHash: row.payload_hash,
    deviceId: row.device_id,
    receivedAt: row.received_at,
    normStatus: row.norm_status as RawRecord["normStatus"],
    normError: row.norm_error,
  };
}

function toHealthEvent(row: {
  id: number;
  event_type: string;
  start_time: string;
  end_time: string | null;
  value: number | null;
  unit: string | null;
  detail: unknown;
  source: string;
  raw_record_id: number | null;
  superseded_by: number | null;
  created_at: string;
}): HealthEvent {
  return {
    id: row.id,
    eventType: row.event_type as HealthEvent["eventType"],
    startTime: row.start_time,
    endTime: row.end_time,
    value: row.value,
    unit: row.unit,
    detail: row.detail as Record<string, unknown> | null,
    source: row.source,
    rawRecordId: row.raw_record_id,
    supersededBy: row.superseded_by,
    createdAt: row.created_at,
  };
}

export async function createSupabaseEventRepository(): Promise<EventRepository> {
  const supabase = await createSupabaseServerClient();

  return {
    async insertRawRecord(
      record: NewRawRecord,
    ): Promise<InsertRawRecordResult> {
      const { data, error } = await supabase
        .from("raw_records")
        .insert({
          source: record.source,
          record_type: record.recordType,
          external_id: record.externalId,
          payload: record.payload as Json,
          payload_hash: record.payloadHash,
          device_id: record.deviceId,
        })
        .select()
        .single();

      if (error) {
        if (error.code === UNIQUE_VIOLATION) {
          return { status: "duplicate" };
        }
        throw error;
      }

      return { status: "accepted", record: toRawRecord(data) };
    },

    async listPendingRawRecords(limit = 100): Promise<RawRecord[]> {
      const { data, error } = await supabase
        .from("raw_records")
        .select()
        .eq("norm_status", "pending")
        .order("received_at", { ascending: true })
        .limit(limit);

      if (error) throw error;
      return data.map(toRawRecord);
    },

    async markRawRecordNormalized(id, result) {
      const { error } = await supabase
        .from("raw_records")
        .update(
          result.status === "done"
            ? { norm_status: "done", norm_error: null }
            : { norm_status: "error", norm_error: result.error },
        )
        .eq("id", id);

      if (error) throw error;
    },

    async insertHealthEvents(
      events: NewHealthEvent[],
    ): Promise<HealthEvent[]> {
      if (events.length === 0) return [];

      const { data, error } = await supabase
        .from("health_events")
        .insert(
          events.map((event) => ({
            event_type: event.eventType,
            start_time: event.startTime,
            end_time: event.endTime,
            value: event.value,
            unit: event.unit,
            detail: event.detail as Json | null,
            source: event.source,
            raw_record_id: event.rawRecordId,
          })),
        )
        .select();

      if (error) throw error;
      return data.map(toHealthEvent);
    },

    async listHealthEvents(params): Promise<HealthEvent[]> {
      let query = supabase
        .from("health_events")
        .select()
        .is("superseded_by", null)
        .order("start_time", { ascending: false });

      if (params.eventType) query = query.eq("event_type", params.eventType);
      if (params.from) query = query.gte("start_time", params.from);
      if (params.to) query = query.lte("start_time", params.to);

      const { data, error } = await query;
      if (error) throw error;
      return data.map(toHealthEvent);
    },
  };
}

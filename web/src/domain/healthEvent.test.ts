import { describe, expect, it } from "vitest";
import { healthEventSchema, newHealthEventSchema } from "./healthEvent";

describe("healthEventSchema", () => {
  it("aceita um evento de sono válido", () => {
    const result = healthEventSchema.safeParse({
      id: 1,
      eventType: "sleep_session",
      startTime: "2026-07-18T23:30:00Z",
      endTime: "2026-07-19T06:45:00Z",
      value: 26100,
      unit: "s",
      detail: { deep_s: 5400, rem_s: 4800 },
      source: "health_connect",
      rawRecordId: 42,
      supersededBy: null,
      createdAt: "2026-07-19T07:00:00Z",
    });

    expect(result.success).toBe(true);
  });

  it("rejeita event_type fora da taxonomia", () => {
    const result = healthEventSchema.safeParse({
      id: 1,
      eventType: "invalid_type",
      startTime: "2026-07-18T23:30:00Z",
      endTime: null,
      value: null,
      unit: null,
      detail: null,
      source: "manual",
      rawRecordId: null,
      supersededBy: null,
      createdAt: "2026-07-19T07:00:00Z",
    });

    expect(result.success).toBe(false);
  });

  it("newHealthEventSchema não exige id/supersededBy/createdAt", () => {
    const result = newHealthEventSchema.safeParse({
      eventType: "weight",
      startTime: "2026-07-19T07:00:00Z",
      endTime: null,
      value: 82.4,
      unit: "kg",
      detail: null,
      source: "manual",
      rawRecordId: null,
    });

    expect(result.success).toBe(true);
  });
});

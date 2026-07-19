import { describe, expect, it } from "vitest";
import { newRawRecordSchema, rawRecordSchema } from "./rawRecord";

describe("rawRecordSchema", () => {
  it("aceita um raw_record válido", () => {
    const result = rawRecordSchema.safeParse({
      id: 1,
      source: "health_connect",
      recordType: "SleepSession",
      externalId: "hc-uuid-123",
      payload: { raw: true },
      payloadHash: "sha256:abc",
      deviceId: "galaxy-s24-pedro",
      receivedAt: "2026-07-19T07:00:00Z",
      normStatus: "pending",
      normError: null,
    });

    expect(result.success).toBe(true);
  });

  it("rejeita source fora da lista permitida", () => {
    const result = rawRecordSchema.safeParse({
      id: 1,
      source: "outro-app",
      recordType: "SleepSession",
      externalId: null,
      payload: {},
      payloadHash: "sha256:abc",
      deviceId: null,
      receivedAt: "2026-07-19T07:00:00Z",
      normStatus: "pending",
      normError: null,
    });

    expect(result.success).toBe(false);
  });

  it("newRawRecordSchema não exige campos gerados pelo servidor", () => {
    const result = newRawRecordSchema.safeParse({
      source: "manual",
      recordType: "WeightEntry",
      externalId: null,
      payload: { kg: 82.4 },
      payloadHash: "sha256:def",
      deviceId: null,
    });

    expect(result.success).toBe(true);
  });
});

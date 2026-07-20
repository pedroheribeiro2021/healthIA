import { describe, expect, it } from "vitest";
import { computePayloadHash } from "./payloadHash";

describe("computePayloadHash", () => {
  it("é estável independente da ordem das chaves", () => {
    const a = computePayloadHash({ kg: 82.4, occurredAt: "2026-07-20T10:00:00Z" });
    const b = computePayloadHash({ occurredAt: "2026-07-20T10:00:00Z", kg: 82.4 });

    expect(a).toBe(b);
  });

  it("difere quando o payload muda", () => {
    const a = computePayloadHash({ kg: 82.4, occurredAt: "2026-07-20T10:00:00Z" });
    const b = computePayloadHash({ kg: 82.5, occurredAt: "2026-07-20T10:00:00Z" });

    expect(a).not.toBe(b);
  });

  it("é determinístico entre chamadas", () => {
    const payload = { a: 1, b: { c: 2, d: [3, 2, 1] } };

    expect(computePayloadHash(payload)).toBe(computePayloadHash(payload));
  });
});

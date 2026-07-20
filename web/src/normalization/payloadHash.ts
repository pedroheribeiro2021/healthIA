import { createHash } from "node:crypto";

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, v]) => [key, canonicalize(v)]),
    );
  }
  return value;
}

// sha256 do payload canônico (chaves ordenadas), usado para dedup na
// ingestão — ver unique(payload_hash) em raw_records (docs/DATA_MODEL.md).
export function computePayloadHash(payload: Record<string, unknown>): string {
  const canonical = JSON.stringify(canonicalize(payload));
  return createHash("sha256").update(canonical).digest("hex");
}

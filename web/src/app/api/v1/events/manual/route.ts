import { NextResponse } from "next/server";
import { manualEntryInputSchema } from "@/domain/manualEntry";
import { ingestRawRecord } from "@/normalization/ingest";
import { buildManualRawRecord } from "@/normalization/manual";
import { createEventRepositoryFromClient } from "@/repositories/eventRepository";
import { authenticateRequest } from "@/repositories/supabase/auth";

// Rota thin (docs/ARCHITECTURE.md): só parse/validação de entrada e resposta
// HTTP. Toda regra (mapeamento de tipo, dedup, normalização) vive em
// domain/normalization.
export async function POST(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth) {
    return NextResponse.json({ error: "não autenticado" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "corpo inválido: JSON esperado" }, { status: 400 });
  }

  const parsed = manualEntryInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "corpo inválido", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const rawRecord = buildManualRawRecord(parsed.data);
  const repo = createEventRepositoryFromClient(auth.client);
  const result = await ingestRawRecord(repo, rawRecord);

  if (result.status === "duplicate") {
    return NextResponse.json({ status: "duplicate" }, { status: 200 });
  }

  return NextResponse.json(
    {
      status: result.status,
      rawRecordId: result.rawRecordId,
      events: result.status === "normalized" ? result.events : [],
      ...(result.status === "raw_only" ? { error: result.error } : {}),
    },
    { status: 201 },
  );
}

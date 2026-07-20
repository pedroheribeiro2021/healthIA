import { NextResponse } from "next/server";
import { syncBatchRequestSchema } from "@/domain/syncBatch";
import { processSyncBatch } from "@/normalization/syncBatch";
import { createEventRepositoryFromClient } from "@/repositories/eventRepository";
import { authenticateRequest } from "@/repositories/supabase/auth";

// Rota thin (docs/ARCHITECTURE.md): parse/validação de entrada + resposta
// HTTP. A pipeline (dedup, normalização) vive em normalization/syncBatch.
// Autenticação via Authorization: Bearer <JWT Supabase> — o sync-app não
// tem cookies de navegador.
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

  const parsed = syncBatchRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "corpo inválido", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const repo = createEventRepositoryFromClient(auth.client);
  const result = await processSyncBatch(
    repo,
    parsed.data.device_id ?? null,
    parsed.data.records.map((record) => ({
      source: record.source,
      recordType: record.record_type,
      externalId: record.external_id ?? null,
      payload: record.payload,
    })),
  );

  return NextResponse.json(result, { status: 200 });
}

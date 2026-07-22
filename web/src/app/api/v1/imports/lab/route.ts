import { NextResponse } from "next/server";
import { labResultInputSchema } from "@/domain/labResult";
import { ingestRawRecord } from "@/normalization/ingest";
import { buildLabImportRawRecord } from "@/normalization/labImport";
import { createEventRepositoryFromClient } from "@/repositories/eventRepository";
import { authenticateRequest } from "@/repositories/supabase/auth";

// Rota thin (docs/ARCHITECTURE.md). O upload do arquivo original (se
// houver) já aconteceu direto do client pro Storage (bucket `exams`) antes
// desta chamada — aqui só chega `examFilePath` como referência. Rota
// separada de /events/manual porque o fluxo de import (arquivo opcional
// associado) é conceitualmente diferente de um lançamento rápido.
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

  const parsed = labResultInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "corpo inválido", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const rawRecord = buildLabImportRawRecord(parsed.data);
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

import { NextResponse } from "next/server";
import { bioimpedanceInputSchema } from "@/domain/bioimpedance";
import { buildBioimpedanceRawRecord } from "@/normalization/bioimpedanceImport";
import { ingestRawRecord } from "@/normalization/ingest";
import { createEventRepositoryFromClient } from "@/repositories/eventRepository";
import { authenticateRequest } from "@/repositories/supabase/auth";

// Rota thin (docs/ARCHITECTURE.md). Sem pipeline automatizado de leitura da
// balança clínica — o Pedro digita os valores do laudo depois da medição.
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

  const parsed = bioimpedanceInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "corpo inválido", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const rawRecord = buildBioimpedanceRawRecord(parsed.data);
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

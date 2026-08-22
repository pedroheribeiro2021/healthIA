import { NextResponse } from "next/server";
import { z } from "zod";
import { getAIProvider } from "@/engines/ai/adapter";
import { extractLabMarkersFromImage } from "@/engines/ai/examExtraction";
import { authenticateRequest } from "@/repositories/supabase/auth";

const bodySchema = z.object({
  imageBase64: z.string().min(1),
  mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]),
});

// Rota thin: só valida entrada, chama o adapter de IA e devolve os
// candidatos pra UI revisar (ADR-006). Nenhum lab_result é gravado aqui —
// isso só acontece quando o Pedro confirma e a UI chama
// POST /api/v1/imports/lab pra cada marcador, igual ao fluxo manual.
export async function POST(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth) {
    return NextResponse.json({ error: "não autenticado" }, { status: 401 });
  }

  const provider = getAIProvider();
  if (!provider) {
    return NextResponse.json(
      { error: "Nenhum provider de IA configurado — registre os valores manualmente." },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "corpo inválido: JSON esperado" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "corpo inválido", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  try {
    const markers = await extractLabMarkersFromImage(provider, {
      mimeType: parsed.data.mimeType,
      base64: parsed.data.imageBase64,
    });
    return NextResponse.json({ markers }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "falha ao extrair o laudo" },
      { status: 502 },
    );
  }
}

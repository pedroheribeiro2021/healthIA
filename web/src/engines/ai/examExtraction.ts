import { z } from "zod";
import { extractedLabMarkerSchema, type ExtractedLabMarker } from "@/domain/labResult";
import type { AIProvider, ImageInput } from "./types";

const SYSTEM_PROMPT = `Você lê laudos de exames laboratoriais e extrai os marcadores exatamente como aparecem no documento — nunca calcule, interprete ou arredonde nada, apenas transcreva.
Responda SOMENTE com um array JSON válido (sem markdown, sem texto antes ou depois), no formato:
[{"marker": "nome_em_snake_case_minusculo", "value": 12.3, "unit": "ng/mL", "referenceMin": 10, "referenceMax": 20}]
Se não conseguir ler a unidade ou a faixa de referência de um marcador, use null nesses campos — nunca invente um valor. Se não achar nenhum marcador legível na imagem, responda com um array vazio [].`;

const USER_PROMPT = "Extraia todos os marcadores deste laudo de exame.";

function stripCodeFence(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  return fenced ? fenced[1] : trimmed;
}

// Pede a extração ao provider configurado e valida a resposta — a IA só
// transcreve o que já está impresso no laudo (ADR-006), o resultado ainda
// passa por confirmação humana na UI antes de virar um lab_result de
// verdade (POST /api/v1/imports/lab, um marcador por vez).
export async function extractLabMarkersFromImage(
  provider: AIProvider,
  image: ImageInput,
): Promise<ExtractedLabMarker[]> {
  const raw = await provider.completeWithImage(SYSTEM_PROMPT, USER_PROMPT, image);

  let parsed: unknown;
  try {
    parsed = JSON.parse(stripCodeFence(raw));
  } catch {
    throw new Error("a IA não retornou um JSON válido");
  }

  const result = z.array(extractedLabMarkerSchema).safeParse(parsed);
  if (!result.success) {
    throw new Error("a IA retornou um formato inesperado");
  }
  return result.data;
}

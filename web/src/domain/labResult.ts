import { z } from "zod";
import { isoDateTimeSchema as isoDateTime } from "./shared";

// Import de exame (docs/DATA_MODEL.md `lab_result`). `examFilePath`
// (opcional) é o caminho do arquivo original já enviado ao bucket privado
// `exams` do Storage, só como referência/anexo.
export const labResultInputSchema = z.object({
  occurredAt: isoDateTime,
  marker: z.string().min(1).max(100),
  value: z.number(),
  unit: z.string().min(1).max(30),
  referenceMin: z.number().optional(),
  referenceMax: z.number().optional(),
  examFilePath: z.string().min(1).max(500).optional(),
});
export type LabResultInput = z.infer<typeof labResultInputSchema>;

// Candidato extraído por IA a partir de foto do laudo (ADR-006) — a IA só
// lê texto já impresso no documento, nunca calcula nada; o Pedro confere e
// edita cada linha antes de qualquer uma virar um POST real em
// /api/v1/imports/lab (mesmo schema de cima, um marcador por vez). `unit`
// e as referências ficam nullable porque a leitura pode não achar essas
// colunas no laudo — a UI obriga a preencher o que faltar antes de importar.
export const extractedLabMarkerSchema = z.object({
  marker: z.string().min(1).max(100),
  value: z.number(),
  unit: z.string().max(30).nullable(),
  referenceMin: z.number().nullable(),
  referenceMax: z.number().nullable(),
});
export type ExtractedLabMarker = z.infer<typeof extractedLabMarkerSchema>;

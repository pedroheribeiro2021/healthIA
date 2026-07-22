import { z } from "zod";
import { isoDateTimeSchema as isoDateTime } from "./shared";

// Import de exame (docs/DATA_MODEL.md `lab_result`) — sem parsing automático
// de PDF/imagem (a IA nunca calcula/extrai indicador, CLAUDE.md), então o
// Pedro digita os valores do laudo; `examFilePath` (opcional) é o caminho
// do arquivo original já enviado ao bucket privado `exams` do Storage,
// só como referência/anexo.
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

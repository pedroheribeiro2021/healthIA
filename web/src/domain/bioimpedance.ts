import { z } from "zod";
import { isoDateTimeSchema as isoDateTime } from "./shared";

// Import de bioimpedância clínica (docs/DATA_MODEL.md `body_composition`,
// origem 'clinical_bia') — sem pipeline automatizado, o Pedro digita os
// valores do laudo da balança clínica. `kg` vem junto porque a balança
// clínica sempre reporta peso (diferente do BodyFatRecord do Health
// Connect, que só manda percentual — ver normalization/healthConnect.ts).
export const bioimpedanceInputSchema = z.object({
  occurredAt: isoDateTime,
  kg: z.number().positive().max(400),
  bodyFatPct: z.number().min(0).max(100).optional(),
  leanMassKg: z.number().positive().max(400).optional(),
  waterPct: z.number().min(0).max(100).optional(),
  bmrKcal: z.number().positive().max(10000).optional(),
});
export type BioimpedanceInput = z.infer<typeof bioimpedanceInputSchema>;

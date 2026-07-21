import { z } from "zod";
import { isoDateTimeSchema as isoDateTime } from "./shared";

export const insightSeveritySchema = z.enum(["info", "attention", "alert"]);
export type InsightSeverity = z.infer<typeof insightSeveritySchema>;

// `evidence` carrega os números que dispararam a regra — é o que a IA
// recebe pra explicar o insight sem recalcular nada (docs/ENGINES.md).
export const insightSchema = z.object({
  id: z.number(),
  ruleId: z.string(),
  severity: insightSeveritySchema,
  title: z.string(),
  body: z.string(),
  evidence: z.record(z.string(), z.unknown()).nullable(),
  periodStart: isoDateTime.nullable(),
  periodEnd: isoDateTime.nullable(),
  dismissed: z.boolean(),
  createdAt: isoDateTime,
});
export type Insight = z.infer<typeof insightSchema>;

export const newInsightSchema = insightSchema.omit({
  id: true,
  dismissed: true,
  createdAt: true,
});
export type NewInsight = z.infer<typeof newInsightSchema>;

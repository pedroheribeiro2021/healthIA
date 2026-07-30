import { z } from "zod";
import {
  comparisonResultSchema,
  periodSchema,
  trendDirectionSchema,
} from "./analytics";
import { goalSchema } from "./goals";
import { isoDateTimeSchema as isoDateTime } from "./shared";

export const reportKindSchema = z.enum(["weekly", "monthly"]);
export type ReportKind = z.infer<typeof reportKindSchema>;

// Um campo de daily_summary resumido no período: comparativo (docs
// ENGINES.md ComparisonEngine) + tendência (TrendAnalyzer), ambos já
// calculados pelo Analytics Engine — o relatório só organiza a saída.
export const reportMetricSchema = z.object({
  key: z.string(),
  label: z.string(),
  comparison: comparisonResultSchema,
  trendDirection: trendDirectionSchema,
  trendConfidence: z.number(),
});
export type ReportMetric = z.infer<typeof reportMetricSchema>;

export const reportGoalProgressSchema = z.object({
  goal: goalSchema,
  currentValue: z.number().nullable(),
});
export type ReportGoalProgress = z.infer<typeof reportGoalProgressSchema>;

export const reportSchema = z.object({
  kind: reportKindSchema,
  periodCurrent: periodSchema,
  periodPrevious: periodSchema,
  metrics: z.array(reportMetricSchema),
  goals: z.array(reportGoalProgressSchema),
  generatedAt: isoDateTime,
});
export type Report = z.infer<typeof reportSchema>;

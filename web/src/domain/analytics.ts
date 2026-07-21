import { z } from "zod";
import { isoDateTimeSchema as isoDateTime } from "./shared";

// Dia local (America/Sao_Paulo), não instante — usado como chave de
// daily_summary e como unidade de janela dos calculators.
export const localDaySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "dia local inválido (esperado YYYY-MM-DD)");
export type LocalDay = z.infer<typeof localDaySchema>;

export const periodSchema = z.object({
  start: isoDateTime,
  end: isoDateTime,
});
export type Period = z.infer<typeof periodSchema>;

export const timeSeriesPointSchema = z.object({
  day: localDaySchema,
  value: z.number().nullable(),
});
export type TimeSeriesPoint = z.infer<typeof timeSeriesPointSchema>;
export type TimeSeries = TimeSeriesPoint[];

// Saída pura de um MetricCalculator (docs/ENGINES.md) — sem id/computedAt,
// que só existem depois de persistido.
export const metricResultSchema = z.object({
  metricId: z.string(),
  periodStart: isoDateTime,
  periodEnd: isoDateTime,
  value: z.number().nullable(),
  detail: z.record(z.string(), z.unknown()).nullable(),
  algoVersion: z.string(),
});
export type MetricResult = z.infer<typeof metricResultSchema>;

export const metricSnapshotSchema = metricResultSchema.extend({
  id: z.number(),
  computedAt: isoDateTime,
});
export type MetricSnapshot = z.infer<typeof metricSnapshotSchema>;

// Idêntico a MetricResult — mantido como alias pra simetria com o resto do
// domínio (toda tabela tem um New<Tabela> usado pelo repositório).
export const newMetricSnapshotSchema = metricResultSchema;
export type NewMetricSnapshot = MetricResult;

export const dailySummarySchema = z.object({
  day: localDaySchema,
  sleepDurationS: z.number().nullable(),
  sleepScore: z.number().nullable(),
  restingHr: z.number().nullable(),
  hrvRmssd: z.number().nullable(),
  steps: z.number().int().nullable(),
  workouts: z.number().int().nullable(),
  trainingLoad: z.number().nullable(),
  kcalIn: z.number().nullable(),
  proteinG: z.number().nullable(),
  waterL: z.number().nullable(),
  weightKg: z.number().nullable(),
  recoveryScore: z.number().nullable(),
  computedAt: isoDateTime,
});
export type DailySummary = z.infer<typeof dailySummarySchema>;

export const newDailySummarySchema = dailySummarySchema.omit({
  computedAt: true,
});
export type NewDailySummary = z.infer<typeof newDailySummarySchema>;

export const trendDirectionSchema = z.enum(["up", "down", "flat"]);
export type TrendDirection = z.infer<typeof trendDirectionSchema>;

export const trendResultSchema = z.object({
  direction: trendDirectionSchema,
  slope: z.number(),
  confidence: z.number(),
  insufficientData: z.boolean(),
});
export type TrendResult = z.infer<typeof trendResultSchema>;

export const comparisonResultSchema = z.object({
  metricId: z.string(),
  periodA: periodSchema,
  periodB: periodSchema,
  meanA: z.number().nullable(),
  meanB: z.number().nullable(),
  deltaAbs: z.number().nullable(),
  deltaPct: z.number().nullable(),
  significant: z.boolean(),
  insufficientData: z.boolean(),
});
export type ComparisonResult = z.infer<typeof comparisonResultSchema>;

// Saída do CorrelationFinder (docs/ENGINES.md): metricA no dia (day - lagDays)
// correlacionado com metricB no dia (day) — "metricA leva/antecede metricB
// em lagDays dias". Só instâncias que já passaram no teste de significância
// (n >= 14, p < 0.05) chegam a existir — ver correlationFinder.ts.
export const correlationResultSchema = z.object({
  metricA: z.string(),
  metricB: z.string(),
  lagDays: z.number().int().min(0),
  rho: z.number(),
  n: z.number().int(),
});
export type CorrelationResult = z.infer<typeof correlationResultSchema>;

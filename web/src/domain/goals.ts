import { z } from "zod";
import { localDaySchema } from "./analytics";
import { isoDateTimeSchema as isoDateTime } from "./shared";

// Tabela `goals` já existe desde a Fase 0 (docs/DATA_MODEL.md). Leitura de
// metas ativas é usada desde a Fase 4 pelas regras de insight (ex.:
// weight_trend_vs_goal, protein_below_target). Criação/gestão de metas
// pelo usuário é a Fase 6.
export const goalDirectionSchema = z.enum(["increase", "decrease", "maintain"]);
export type GoalDirection = z.infer<typeof goalDirectionSchema>;

export const goalSchema = z.object({
  id: z.number(),
  metricId: z.string(),
  targetValue: z.number(),
  direction: goalDirectionSchema,
  deadline: z.string().nullable(),
  active: z.boolean(),
  createdAt: isoDateTime,
});
export type Goal = z.infer<typeof goalSchema>;

// Validação estrutural apenas (shape). Quais `metricId` são aceitáveis como
// meta é regra de negócio — vive em engines/goals/goalMetrics.ts
// (isValidGoalMetricId), aplicada na rota, não aqui.
export const newGoalInputSchema = z.object({
  metricId: z.string().min(1),
  targetValue: z.number(),
  direction: goalDirectionSchema,
  deadline: localDaySchema.nullable().optional(),
});
export type NewGoalInput = z.infer<typeof newGoalInputSchema>;

// Edição de meta existente (Fase 7): metricId não entra — trocar a métrica
// de uma meta já em andamento invalidaria o histórico dela; pra isso,
// desativar e criar outra. Aqui é só ajuste de valor/direção/prazo.
export const updateGoalInputSchema = z.object({
  targetValue: z.number().optional(),
  direction: goalDirectionSchema.optional(),
  deadline: localDaySchema.nullable().optional(),
});
export type UpdateGoalInput = z.infer<typeof updateGoalInputSchema>;

import { z } from "zod";
import { isoDateTimeSchema as isoDateTime } from "./shared";

// Tabela `goals` já existe desde a Fase 0 (docs/DATA_MODEL.md), mas a
// criação de metas pelo usuário é escopo da Fase 6 ("Metas, Relatórios e
// IA"). Aqui só o necessário pra Fase 4 ler metas ativas dentro das regras
// de insight (ex.: weight_trend_vs_goal) — sem rota de criação ainda, então
// hoje `listActiveGoals()` sempre retorna vazio em produção; fica pronto
// para quando a Fase 6 adicionar a UI de metas (mesmo padrão do calculator
// de HRV na Fase 3: implementado antes do dado existir).
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

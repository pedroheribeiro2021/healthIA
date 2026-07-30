import { z } from "zod";
import { localDaySchema } from "./analytics";
import { isoDateTimeSchema as isoDateTime } from "./shared";

// Tabelas `habits`/`habit_logs` — Fase 7 (docs/FASE-7-ROTINA.md, 1.1).
// Hábitos são entidade de 1ª classe: streak, adesão e regra de insight
// exigem dado estruturado, não um checkbox de UI nem `note` em health_events.
export const habitCategorySchema = z.enum([
  "treino",
  "nutricao",
  "hidratacao",
  "suplementacao",
  "sono",
]);
export type HabitCategory = z.infer<typeof habitCategorySchema>;

export const habitKindSchema = z.enum(["boolean", "quantity"]);
export type HabitKind = z.infer<typeof habitKindSchema>;

// 'derived': lido de health_events (musculacao/agua/dormir_cedo), só leitura
// na UI. 'manual_log': marcado pelo usuário via habit_logs.
export const habitSourceKindSchema = z.enum(["manual_log", "derived"]);
export type HabitSourceKind = z.infer<typeof habitSourceKindSchema>;

// 'bonus' não entra no denominador da adesão (docs/FASE-7-ROTINA.md, 1.3).
export const habitPrioritySchema = z.enum(["core", "bonus"]);
export type HabitPriority = z.infer<typeof habitPrioritySchema>;

export const habitSchema = z.object({
  id: z.number(),
  slug: z.string(),
  name: z.string(),
  category: habitCategorySchema,
  kind: habitKindSchema,
  unit: z.string().nullable(),
  targetPerDay: z.number().nullable(),
  targetPerWeek: z.number(),
  sourceKind: habitSourceKindSchema,
  priority: habitPrioritySchema,
  sortOrder: z.number().int(),
  active: z.boolean(),
  createdAt: isoDateTime,
});
export type Habit = z.infer<typeof habitSchema>;

// habit_logs é mutável por dia (upsert + delete) — única exceção ao
// append-only do schema (ADR-005): adesão é intenção corrigível pelo
// próprio usuário, não medição.
export const habitLogSchema = z.object({
  id: z.number(),
  habitId: z.number(),
  day: localDaySchema,
  done: z.boolean(),
  quantity: z.number().nullable(),
  note: z.string().nullable(),
  loggedAt: isoDateTime,
});
export type HabitLog = z.infer<typeof habitLogSchema>;

export const newHabitLogInputSchema = z.object({
  day: localDaySchema,
  done: z.boolean().default(true),
  quantity: z.number().nullable().optional(),
  note: z.string().nullable().optional(),
});
export type NewHabitLogInput = z.infer<typeof newHabitLogInputSchema>;

// Estado de hoje de um hábito já resolvido (log manual OU derivado de
// health_events) — o que GET /api/v1/habits devolve pra UI, sem que o
// client precise saber a diferença entre as duas origens.
export const habitTodayStateSchema = z.object({
  habit: habitSchema,
  done: z.boolean(),
  quantity: z.number().nullable(),
  source: z.enum(["log", "derived", "none"]),
});
export type HabitTodayState = z.infer<typeof habitTodayStateSchema>;

// Um dia da grade semanal de GET /api/v1/habits/week.
export const habitWeekDaySchema = z.object({
  day: localDaySchema,
  done: z.boolean(),
  quantity: z.number().nullable(),
});
export type HabitWeekDay = z.infer<typeof habitWeekDaySchema>;

export const habitWeekEntrySchema = z.object({
  habit: habitSchema,
  days: z.array(habitWeekDaySchema),
  streak: z.number().int(),
  completedThisWeek: z.number(),
});
export type HabitWeekEntry = z.infer<typeof habitWeekEntrySchema>;

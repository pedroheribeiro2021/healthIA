import type { LocalDay } from "@/domain/analytics";
import type { Habit, HabitLog } from "@/domain/habits";
import { addDays } from "@/engines/analytics/period";

// Subconjunto estrutural de HabitLog — deixa computeStreak/countDoneInDays
// reutilizáveis tanto sobre habit_logs reais quanto sobre o estado do dia
// já resolvido de hábitos derivados (que não têm log de verdade), sem
// precisar fabricar HabitLog fake em quem chama (habitService.ts).
type DoneByDay = { day: LocalDay; done: boolean };

// Streak (dias consecutivos com done=true) terminando em `uptoDay`
// (inclusive), voltando no tempo até achar um dia sem done. Pura, on-demand
// sobre habit_logs — não vira metric_snapshot (docs/FASE-7-ROTINA.md, 1.3):
// é consulta barata e um metric_id por hábito faria a camada derivada
// crescer a cada hábito novo.
export function computeStreak(logs: readonly DoneByDay[], uptoDay: LocalDay): number {
  const doneDays = new Set(logs.filter((l) => l.done).map((l) => l.day));
  let streak = 0;
  let day = uptoDay;
  while (doneDays.has(day)) {
    streak++;
    day = addDays(day, -1);
  }
  return streak;
}

// Quantas vezes, dentro do conjunto de dias informado, o hábito foi
// cumprido — usado tanto pra "quantas vezes nos últimos 7 dias" quanto pra
// contagem semanal de habit_logs/week.
export function countDoneInDays(
  logs: readonly DoneByDay[],
  days: readonly LocalDay[],
): number {
  const daySet = new Set(days);
  return logs.filter((l) => l.done && daySet.has(l.day)).length;
}

// Segunda-feira da semana ISO que contém `day`.
export function isoWeekStart(day: LocalDay): LocalDay {
  const [year, month, date] = day.split("-").map(Number);
  const utcDate = new Date(Date.UTC(year, month - 1, date));
  const dow = utcDate.getUTCDay(); // 0=domingo .. 6=sábado
  const diffToMonday = dow === 0 ? 6 : dow - 1;
  return addDays(day, -diffToMonday);
}

export function daysOfIsoWeek(day: LocalDay): LocalDay[] {
  const start = isoWeekStart(day);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

// Regra de exclusão do denominador da adesão diária (docs/FASE-7-ROTINA.md,
// 1.3): hábito com target_per_week < 7 só entra no dia se AINDA faltarem
// ocorrências pra bater a meta da semana — uma vez cumprida a meta antes de
// `day`, o hábito some do denominador pro resto da semana (escadas 3x/semana
// já cumpridas na quarta não derrubam a adesão de quinta a domingo).
// Hábitos diários (target_per_week >= 7) nunca são excluídos por esta regra.
export function weeklyTargetAlreadyMetBeforeDay(
  habit: Habit,
  logs: HabitLog[],
  day: LocalDay,
): boolean {
  if (habit.targetPerWeek >= 7) return false;
  const daysBeforeToday = daysOfIsoWeek(day).filter((d) => d < day);
  return countDoneInDays(logs, daysBeforeToday) >= habit.targetPerWeek;
}

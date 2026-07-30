import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Habit,
  HabitCategory,
  HabitKind,
  HabitLog,
  HabitPriority,
  HabitSourceKind,
  NewHabitLogInput,
} from "@/domain/habits";
import type { HabitRepository } from "@/domain/repositories";
import type { Database } from "./supabase/databaseTypes";
import { createSupabaseServerClient } from "./supabase/serverClient";

function toHabit(row: {
  id: number;
  slug: string;
  name: string;
  category: string;
  kind: string;
  unit: string | null;
  target_per_day: number | null;
  target_per_week: number;
  source_kind: string;
  priority: string;
  sort_order: number;
  active: boolean;
  created_at: string;
}): Habit {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    category: row.category as HabitCategory,
    kind: row.kind as HabitKind,
    unit: row.unit,
    targetPerDay: row.target_per_day,
    targetPerWeek: row.target_per_week,
    sourceKind: row.source_kind as HabitSourceKind,
    priority: row.priority as HabitPriority,
    sortOrder: row.sort_order,
    active: row.active,
    createdAt: row.created_at,
  };
}

function toHabitLog(row: {
  id: number;
  habit_id: number;
  day: string;
  done: boolean;
  quantity: number | null;
  note: string | null;
  logged_at: string;
}): HabitLog {
  return {
    id: row.id,
    habitId: row.habit_id,
    day: row.day,
    done: row.done,
    quantity: row.quantity,
    note: row.note,
    loggedAt: row.logged_at,
  };
}

// Fábrica pura, mesmo padrão de goalRepository.ts.
export function createHabitRepositoryFromClient(
  supabase: SupabaseClient<Database, "healthia">,
): HabitRepository {
  return {
    async listActiveHabits(): Promise<Habit[]> {
      const { data, error } = await supabase
        .from("habits")
        .select()
        .eq("active", true)
        .order("sort_order", { ascending: true });

      if (error) throw error;
      return data.map(toHabit);
    },

    async listLogs(params: { from: string; to: string }): Promise<HabitLog[]> {
      const { data, error } = await supabase
        .from("habit_logs")
        .select()
        .gte("day", params.from)
        .lte("day", params.to);

      if (error) throw error;
      return data.map(toHabitLog);
    },

    // Upsert por (habit_id, day) — habit_logs é mutável por dia (ADR-005),
    // diferente de todo o resto do schema.
    async upsertLog(habitId: number, input: NewHabitLogInput): Promise<HabitLog> {
      const { data, error } = await supabase
        .from("habit_logs")
        .upsert(
          {
            habit_id: habitId,
            day: input.day,
            done: input.done,
            quantity: input.quantity ?? null,
            note: input.note ?? null,
            logged_at: new Date().toISOString(),
          },
          { onConflict: "habit_id,day" },
        )
        .select()
        .single();

      if (error) throw error;
      return toHabitLog(data);
    },

    async deleteLog(habitId: number, day: string): Promise<void> {
      const { error } = await supabase
        .from("habit_logs")
        .delete()
        .eq("habit_id", habitId)
        .eq("day", day);

      if (error) throw error;
    },
  };
}

export async function createSupabaseHabitRepository(): Promise<HabitRepository> {
  const supabase = await createSupabaseServerClient();
  return createHabitRepositoryFromClient(supabase);
}

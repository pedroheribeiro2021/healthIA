import type { SupabaseClient } from "@supabase/supabase-js";
import type { Goal, GoalDirection } from "@/domain/goals";
import type { GoalRepository } from "@/domain/repositories";
import type { Database } from "./supabase/databaseTypes";
import { createSupabaseServerClient } from "./supabase/serverClient";

function toGoal(row: {
  id: number;
  metric_id: string;
  target_value: number;
  direction: string;
  deadline: string | null;
  active: boolean;
  created_at: string;
}): Goal {
  return {
    id: row.id,
    metricId: row.metric_id,
    targetValue: row.target_value,
    direction: row.direction as GoalDirection,
    deadline: row.deadline,
    active: row.active,
    createdAt: row.created_at,
  };
}

// Fábrica pura, mesmo padrão de eventRepository.ts. Só leitura hoje —
// criação de metas é Fase 6 (ver domain/goals.ts).
export function createGoalRepositoryFromClient(
  supabase: SupabaseClient<Database, "healthia">,
): GoalRepository {
  return {
    async listActiveGoals(): Promise<Goal[]> {
      const { data, error } = await supabase
        .from("goals")
        .select()
        .eq("active", true);

      if (error) throw error;
      return data.map(toGoal);
    },
  };
}

export async function createSupabaseGoalRepository(): Promise<GoalRepository> {
  const supabase = await createSupabaseServerClient();
  return createGoalRepositoryFromClient(supabase);
}

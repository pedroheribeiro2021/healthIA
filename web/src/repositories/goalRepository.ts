import type { SupabaseClient } from "@supabase/supabase-js";
import type { Goal, GoalDirection, NewGoalInput } from "@/domain/goals";
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

// Fábrica pura, mesmo padrão de eventRepository.ts.
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

    async listGoals(): Promise<Goal[]> {
      const { data, error } = await supabase
        .from("goals")
        .select()
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data.map(toGoal);
    },

    async createGoal(input: NewGoalInput): Promise<Goal> {
      const { data, error } = await supabase
        .from("goals")
        .insert({
          metric_id: input.metricId,
          target_value: input.targetValue,
          direction: input.direction,
          deadline: input.deadline ?? null,
        })
        .select()
        .single();

      if (error) throw error;
      return toGoal(data);
    },

    // Sem hard delete (mesmo espírito de recommendations.status/recipes.archived)
    // — "remover" uma meta preserva histórico pra relatórios futuros.
    async deactivateGoal(id: number): Promise<Goal> {
      const { data, error } = await supabase
        .from("goals")
        .update({ active: false })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return toGoal(data);
    },
  };
}

export async function createSupabaseGoalRepository(): Promise<GoalRepository> {
  const supabase = await createSupabaseServerClient();
  return createGoalRepositoryFromClient(supabase);
}

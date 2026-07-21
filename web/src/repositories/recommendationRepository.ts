import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  NewRecommendation,
  Recommendation,
  RecommendationStatus,
} from "@/domain/recommendations";
import type { RecommendationRepository } from "@/domain/repositories";
import type { Database } from "./supabase/databaseTypes";
import { createSupabaseServerClient } from "./supabase/serverClient";

function toRecommendation(row: {
  id: number;
  insight_id: number | null;
  action_type: string;
  title: string;
  body: string;
  priority: number;
  status: string;
  created_at: string;
}): Recommendation {
  return {
    id: row.id,
    insightId: row.insight_id,
    actionType: row.action_type,
    title: row.title,
    body: row.body,
    priority: row.priority,
    status: row.status as RecommendationStatus,
    createdAt: row.created_at,
  };
}

// Fábrica pura, mesmo padrão de eventRepository.ts.
export function createRecommendationRepositoryFromClient(
  supabase: SupabaseClient<Database, "healthia">,
): RecommendationRepository {
  return {
    async insertRecommendation(
      recommendation: NewRecommendation,
    ): Promise<Recommendation> {
      const { data, error } = await supabase
        .from("recommendations")
        .insert({
          insight_id: recommendation.insightId,
          action_type: recommendation.actionType,
          title: recommendation.title,
          body: recommendation.body,
          priority: recommendation.priority,
        })
        .select()
        .single();

      if (error) throw error;
      return toRecommendation(data);
    },

    async findOpenByInsightId(insightId): Promise<Recommendation | null> {
      const { data, error } = await supabase
        .from("recommendations")
        .select()
        .eq("insight_id", insightId)
        .eq("status", "open")
        .maybeSingle();

      if (error) throw error;
      return data ? toRecommendation(data) : null;
    },

    async listByStatus(status): Promise<Recommendation[]> {
      const { data, error } = await supabase
        .from("recommendations")
        .select()
        .eq("status", status)
        .order("priority", { ascending: true });

      if (error) throw error;
      return data.map(toRecommendation);
    },

    async updateStatus(id, status): Promise<Recommendation> {
      const { data, error } = await supabase
        .from("recommendations")
        .update({ status })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return toRecommendation(data);
    },
  };
}

export async function createSupabaseRecommendationRepository(): Promise<RecommendationRepository> {
  const supabase = await createSupabaseServerClient();
  return createRecommendationRepositoryFromClient(supabase);
}

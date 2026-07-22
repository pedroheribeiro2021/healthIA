import type { SupabaseClient } from "@supabase/supabase-js";
import type { Food, Macros } from "@/domain/nutrition";
import type { FoodRepository } from "@/domain/repositories";
import type { Database } from "./supabase/databaseTypes";
import { createSupabaseServerClient } from "./supabase/serverClient";

function toFood(row: { id: number; name: string; per_100g: unknown }): Food {
  return { id: row.id, name: row.name, per100g: row.per_100g as Macros };
}

// Fábrica pura, mesmo padrão de eventRepository.ts. Só leitura — a base é
// povoada por seed/migration (Fase 5), sem CRUD do usuário.
export function createFoodRepositoryFromClient(
  supabase: SupabaseClient<Database, "healthia">,
): FoodRepository {
  return {
    async searchFoods(query, limit = 20): Promise<Food[]> {
      const { data, error } = await supabase
        .from("foods")
        .select()
        .ilike("name", `%${query}%`)
        .order("name", { ascending: true })
        .limit(limit);

      if (error) throw error;
      return data.map(toFood);
    },

    async getFoodById(id): Promise<Food | null> {
      const { data, error } = await supabase.from("foods").select().eq("id", id).maybeSingle();
      if (error) throw error;
      return data ? toFood(data) : null;
    },
  };
}

export async function createSupabaseFoodRepository(): Promise<FoodRepository> {
  const supabase = await createSupabaseServerClient();
  return createFoodRepositoryFromClient(supabase);
}

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  NewShoppingListItemInput,
  ShoppingListItem,
  ShoppingListStatus,
} from "@/domain/nutrition";
import type { ShoppingListRepository } from "@/domain/repositories";
import type { Database } from "./supabase/databaseTypes";
import { createSupabaseServerClient } from "./supabase/serverClient";

function toShoppingListItem(row: {
  id: number;
  food_name: string;
  quantity: number | null;
  unit: string | null;
  status: string;
  origin_recipe_id: number | null;
  created_at: string;
}): ShoppingListItem {
  return {
    id: row.id,
    foodName: row.food_name,
    quantity: row.quantity,
    unit: row.unit,
    status: row.status as ShoppingListStatus,
    originRecipeId: row.origin_recipe_id,
    createdAt: row.created_at,
  };
}

// Fábrica pura, mesmo padrão de eventRepository.ts.
export function createShoppingListRepositoryFromClient(
  supabase: SupabaseClient<Database, "healthia">,
): ShoppingListRepository {
  return {
    async addItem(input: NewShoppingListItemInput): Promise<ShoppingListItem> {
      const { data, error } = await supabase
        .from("shopping_list_items")
        .insert({
          food_name: input.foodName,
          quantity: input.quantity ?? null,
          unit: input.unit ?? null,
        })
        .select()
        .single();

      if (error) throw error;
      return toShoppingListItem(data);
    },

    async listByStatus(status): Promise<ShoppingListItem[]> {
      const { data, error } = await supabase
        .from("shopping_list_items")
        .select()
        .eq("status", status)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data.map(toShoppingListItem);
    },

    async markBought(id): Promise<ShoppingListItem> {
      const { data, error } = await supabase
        .from("shopping_list_items")
        .update({ status: "bought" })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return toShoppingListItem(data);
    },
  };
}

export async function createSupabaseShoppingListRepository(): Promise<ShoppingListRepository> {
  const supabase = await createSupabaseServerClient();
  return createShoppingListRepositoryFromClient(supabase);
}

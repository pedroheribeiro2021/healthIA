import { createClient } from "@supabase/supabase-js";
import type { Database } from "./databaseTypes";
import { supabaseServiceRoleKey, supabaseUrl } from "./env";

/**
 * Cliente Supabase com `service_role` — bypassa RLS. Uso exclusivo da rota
 * de cron (docs/ARCHITECTURE.md: "cron usa service_role, nunca exposto ao
 * cliente"). Nunca importar fora de rotas server-side de infraestrutura.
 */
export function createSupabaseServiceRoleClient() {
  return createClient<Database, "healthia">(
    supabaseUrl(),
    supabaseServiceRoleKey(),
    {
      db: { schema: "healthia" },
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
}

import { createClient } from "@supabase/supabase-js";
import type { Database } from "./databaseTypes";
import { supabasePublishableKey, supabaseUrl } from "./env";

/**
 * Cliente Supabase para requisições autenticadas via
 * `Authorization: Bearer <JWT>` (sync-app e outros clientes sem cookies de
 * navegador). O JWT é repassado no header para que a RLS avalie
 * `auth.uid()` normalmente — mesmo mecanismo do cliente cookie-based, só
 * que sem sessão persistida no servidor.
 */
export function createSupabaseBearerClient(accessToken: string) {
  return createClient<Database, "healthia">(
    supabaseUrl(),
    supabasePublishableKey(),
    {
      db: { schema: "healthia" },
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
}

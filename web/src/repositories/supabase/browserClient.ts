import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./databaseTypes";
import { supabasePublishableKey, supabaseUrl } from "./env";

export function createSupabaseBrowserClient() {
  return createBrowserClient<Database, "healthia">(
    supabaseUrl(),
    supabasePublishableKey(),
    { db: { schema: "healthia" } },
  );
}

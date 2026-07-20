import "react-native-url-polyfill/auto";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "../config/env";
import { secureStoreAdapter } from "./secureStoreAdapter";

// Mesmo projeto/schema do web app; login único com a conta do Pedro
// (docs/ARCHITECTURE.md — sem cadastro, RLS trava no UUID dele).
export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  db: { schema: "healthia" },
  auth: {
    storage: secureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

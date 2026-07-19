import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "./databaseTypes";
import { supabasePublishableKey, supabaseUrl } from "./env";

/**
 * Cliente Supabase para Server Components e Route Handlers: roda com a
 * sessão do usuário autenticado (cookies), nunca com service_role.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient<Database, "healthia">(
    supabaseUrl(),
    supabasePublishableKey(),
    {
      db: { schema: "healthia" },
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Chamado de um Server Component sem permissão de escrita;
            // o middleware já cuida do refresh de sessão nesse caso.
          }
        },
      },
    },
  );
}

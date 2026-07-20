import type { SupabaseClient, User } from "@supabase/supabase-js";
import type { Database } from "./databaseTypes";
import { createSupabaseBearerClient } from "./bearerClient";
import { createSupabaseServerClient } from "./serverClient";

export type AuthenticatedRequest = {
  client: SupabaseClient<Database, "healthia">;
  user: User;
};

/**
 * Autentica uma Route Handler para os dois tipos de cliente do app:
 * navegador (cookies de sessão) e sync-app/outros clientes externos
 * (`Authorization: Bearer <JWT Supabase>`, ver docs/ARCHITECTURE.md).
 * Retorna null se nenhum dos dois produzir uma sessão válida.
 */
export async function authenticateRequest(
  request: Request,
): Promise<AuthenticatedRequest | null> {
  const authHeader = request.headers.get("authorization");
  const bearerToken = authHeader?.match(/^Bearer\s+(.+)$/i)?.[1];

  const client = bearerToken
    ? createSupabaseBearerClient(bearerToken)
    : await createSupabaseServerClient();

  const {
    data: { user },
    error,
  } = await client.auth.getUser();

  if (error || !user) return null;
  return { client, user };
}

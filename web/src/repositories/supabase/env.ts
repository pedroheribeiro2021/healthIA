// NEXT_PUBLIC_* precisa ser acessado como `process.env.NOME_LITERAL` — o
// Next.js só faz a substituição no bundle do client com esse padrão estático,
// não com acesso dinâmico (`process.env[name]`).

export function supabaseUrl(): string {
  const value = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!value) {
    throw new Error("Variável de ambiente ausente: NEXT_PUBLIC_SUPABASE_URL");
  }
  return value;
}

export function supabasePublishableKey(): string {
  const value = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!value) {
    throw new Error(
      "Variável de ambiente ausente: NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    );
  }
  return value;
}

export function supabaseServiceRoleKey(): string {
  const value = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!value) {
    throw new Error("Variável de ambiente ausente: SUPABASE_SERVICE_ROLE_KEY");
  }
  return value;
}

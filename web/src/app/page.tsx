import { LogoutButton } from "@/components/LogoutButton";
import { createSupabaseServerClient } from "@/repositories/supabase/serverClient";

export default async function Home() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="flex flex-1 flex-col bg-neutral-50 dark:bg-neutral-950">
      <header className="flex items-center justify-between border-b border-neutral-200 px-6 py-4 dark:border-neutral-800">
        <h1 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
          HealthIA
        </h1>
        <LogoutButton />
      </header>
      <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
        <p className="text-sm text-neutral-500">
          Sessão ativa: {user?.email ?? user?.id}
        </p>
        <p className="max-w-sm text-sm text-neutral-400">
          Dashboard ainda vazio — vem na Fase 3 do roadmap (docs/ROADMAP.md).
        </p>
      </div>
    </main>
  );
}

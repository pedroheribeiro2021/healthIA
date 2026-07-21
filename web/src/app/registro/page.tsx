import { LogoutButton } from "@/components/LogoutButton";
import { QuickEntryForm } from "@/modules/registro/QuickEntryForm";
import { WeightChart } from "@/modules/registro/WeightChart";
import { createSupabaseEventRepository } from "@/repositories/eventRepository";
import { createSupabaseServerClient } from "@/repositories/supabase/serverClient";

export default async function RegistroPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const repo = await createSupabaseEventRepository();
  const weightEvents = await repo.listHealthEvents({ eventType: "weight" });

  return (
    <main className="flex flex-1 flex-col bg-neutral-50 pb-20 dark:bg-neutral-950">
      <header className="flex items-center justify-between border-b border-neutral-200 px-6 py-4 dark:border-neutral-800">
        <h1 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
          Registro
        </h1>
        <LogoutButton />
      </header>
      <div className="flex flex-1 flex-col items-center gap-6 px-6 py-8">
        <p className="text-sm text-neutral-500">
          Sessão ativa: {user?.email ?? user?.id}
        </p>
        <WeightChart
          events={weightEvents
            .filter((event) => event.value !== null)
            .slice(0, 60)
            .map((event) => ({
              startTime: event.startTime,
              value: event.value as number,
            }))}
        />
        <QuickEntryForm />
      </div>
    </main>
  );
}

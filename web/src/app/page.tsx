import { LogoutButton } from "@/components/LogoutButton";
import { getMetricSeries } from "@/engines/analytics/queries";
import { addDays, todayLocalDay } from "@/engines/analytics/period";
import { OverviewCards } from "@/modules/dashboard/OverviewCards";
import { RecoveryTrendChart } from "@/modules/dashboard/RecoveryTrendChart";
import { createSupabaseMetricRepository } from "@/repositories/metricRepository";
import { createSupabaseServerClient } from "@/repositories/supabase/serverClient";

// Critério de "pronto" da Fase 3 (docs/ROADMAP.md): abrir aqui de manhã
// responde "como estou hoje" sem tocar em nada. Server Component só busca
// dados já calculados pelo Analytics Engine (cron/admin recompute) —
// nenhum cálculo acontece neste arquivo.
export default async function Home() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const metricRepo = await createSupabaseMetricRepository();
  const today = todayLocalDay();
  const summary = await metricRepo.getLatestDailySummary();
  const { series: recoverySeries } = await getMetricSeries(
    metricRepo,
    "recovery.score.daily",
    addDays(today, -29),
    today,
  );

  return (
    <main className="flex flex-1 flex-col bg-neutral-50 pb-20 dark:bg-neutral-950">
      <header className="flex items-center justify-between border-b border-neutral-200 px-6 py-4 dark:border-neutral-800">
        <h1 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
          HealthIA
        </h1>
        <LogoutButton />
      </header>
      <div className="flex flex-1 flex-col items-center gap-6 px-6 py-8">
        <p className="text-sm text-neutral-500">
          Sessão ativa: {user?.email ?? user?.id}
          {summary && (
            <>
              {" · "}
              {summary.day === today ? "hoje" : `último dado: ${summary.day}`}
            </>
          )}
        </p>
        <OverviewCards summary={summary} />
        <RecoveryTrendChart series={recoverySeries} />
      </div>
    </main>
  );
}

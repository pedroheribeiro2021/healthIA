import { LogoutButton } from "@/components/LogoutButton";
import { RegistroFab } from "@/components/RegistroFab";
import { localDaySchema } from "@/domain/analytics";
import { getMetricSeries } from "@/engines/analytics/queries";
import { addDays, localDayBounds, todayLocalDay } from "@/engines/analytics/period";
import { getHabitWeek, getTodayHabitStates } from "@/engines/habits/habitService";
import { AlertBanner } from "@/modules/insights/AlertBanner";
import { OverviewCards } from "@/modules/dashboard/OverviewCards";
import { recoveryHint } from "@/modules/dashboard/recoveryHint";
import { RecoveryTrendChart } from "@/modules/dashboard/RecoveryTrendChart";
import { CheckinCard } from "@/modules/rotina/CheckinCard";
import { createSupabaseEventRepository } from "@/repositories/eventRepository";
import { createSupabaseHabitRepository } from "@/repositories/habitRepository";
import { createSupabaseMetricRepository } from "@/repositories/metricRepository";
import { createSupabaseRecommendationRepository } from "@/repositories/recommendationRepository";
import { createSupabaseServerClient } from "@/repositories/supabase/serverClient";

// Critério de "pronto" da Fase 3 (docs/ROADMAP.md): abrir aqui de manhã
// responde "como estou hoje" sem tocar em nada. Server Component só busca
// dados já calculados pelo Analytics Engine (cron/admin recompute) —
// nenhum cálculo acontece neste arquivo.
export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ day?: string }>;
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const metricRepo = await createSupabaseMetricRepository();
  const recommendationRepo = await createSupabaseRecommendationRepository();
  const habitRepo = await createSupabaseHabitRepository();
  const eventRepo = await createSupabaseEventRepository();
  const today = todayLocalDay();

  // Navegação por dias no bloco "Rotina de hoje" (?day=YYYY-MM-DD) — só
  // afeta o check-in de hábitos; o resto do dashboard (summary, recovery,
  // recomendações) continua ancorado em hoje. Dia inválido ou no futuro cai
  // de volta pra hoje.
  const { day: dayParam } = await searchParams;
  const parsedDay = dayParam ? localDaySchema.safeParse(dayParam) : null;
  const selectedDay = parsedDay?.success && parsedDay.data <= today ? parsedDay.data : today;

  const [
    summary,
    { series: recoverySeries },
    todayRecoverySnapshots,
    openRecommendations,
    todayStates,
    week,
  ] = await Promise.all([
    metricRepo.getLatestDailySummary(),
    getMetricSeries(metricRepo, "recovery.score.daily", addDays(today, -29), today),
    metricRepo.listMetricSnapshots({
      metricId: "recovery.score.daily",
      from: localDayBounds(today).start,
      to: localDayBounds(today).end,
    }),
    recommendationRepo.listByStatus("open"),
    getTodayHabitStates(habitRepo, eventRepo, selectedDay),
    getHabitWeek(habitRepo, eventRepo, selectedDay),
  ]);
  const recoveryDetailHint = recoveryHint(todayRecoverySnapshots.at(-1)?.detail);
  const streakByHabitId = new Map(week.map((entry) => [entry.habit.id, entry.streak]));
  const checkinRows = todayStates.map((state) => ({
    ...state,
    streak: streakByHabitId.get(state.habit.id) ?? 0,
  }));

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
        <AlertBanner openCount={openRecommendations.length} />
        <CheckinCard initialStates={checkinRows} day={selectedDay} today={today} />
        <OverviewCards summary={summary} recoveryHint={recoveryDetailHint} />
        <RecoveryTrendChart series={recoverySeries} />
      </div>
      <RegistroFab />
    </main>
  );
}

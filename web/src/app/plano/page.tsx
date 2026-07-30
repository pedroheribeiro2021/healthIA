import {
  CARDAPIO_REFERENCIA,
  LISTA_DE_COMPRAS,
  PORCOES_REFERENCIA,
  RECEITAS_REFERENCIA,
  REGRAS_ALIMENTACAO,
  SUPLEMENTACAO,
} from "@/content/planoSaude";
import { todayLocalDay } from "@/engines/analytics/period";
import { listGoalsWithProgress } from "@/engines/goals/goalService";
import { getHabitWeek } from "@/engines/habits/habitService";
import { GoalList } from "@/modules/metas/GoalList";
import { WeekGrid } from "@/modules/rotina/WeekGrid";
import { createSupabaseEventRepository } from "@/repositories/eventRepository";
import { createSupabaseGoalRepository } from "@/repositories/goalRepository";
import { createSupabaseHabitRepository } from "@/repositories/habitRepository";
import { createSupabaseMetricRepository } from "@/repositories/metricRepository";

export default async function PlanoPage() {
  const [goalRepo, metricRepo, habitRepo, eventRepo] = await Promise.all([
    createSupabaseGoalRepository(),
    createSupabaseMetricRepository(),
    createSupabaseHabitRepository(),
    createSupabaseEventRepository(),
  ]);

  const today = todayLocalDay();
  const [goals, week] = await Promise.all([
    listGoalsWithProgress(goalRepo, metricRepo, today),
    getHabitWeek(habitRepo, eventRepo, today),
  ]);
  const activeGoals = goals.filter((g) => g.goal.active);

  return (
    <main className="flex flex-1 flex-col items-center gap-8 bg-neutral-50 px-6 py-8 pb-20 dark:bg-neutral-950">
      <h1 className="w-full max-w-md text-lg font-semibold text-neutral-900 dark:text-neutral-100">
        Plano
      </h1>

      <section className="flex w-full max-w-md flex-col gap-3">
        <h2 className="text-sm font-medium text-neutral-500">Metas</h2>
        <GoalList goals={activeGoals} />
      </section>

      <section className="flex w-full max-w-md flex-col gap-3">
        <h2 className="text-sm font-medium text-neutral-500">Semana</h2>
        <div className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
          <WeekGrid entries={week} />
        </div>
      </section>

      <section className="flex w-full max-w-md flex-col gap-4">
        <h2 className="text-sm font-medium text-neutral-500">Referências</h2>

        <div className="rounded-xl border border-neutral-200 bg-white p-4 text-sm text-neutral-700 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300">
          <h3 className="mb-2 font-medium text-neutral-900 dark:text-neutral-100">
            Regras
          </h3>
          <ul className="list-inside list-disc space-y-1">
            {REGRAS_ALIMENTACAO.map((regra) => (
              <li key={regra}>{regra}</li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border border-neutral-200 bg-white p-4 text-sm text-neutral-700 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300">
          <h3 className="mb-2 font-medium text-neutral-900 dark:text-neutral-100">
            Porções (almoço)
          </h3>
          <ul className="space-y-1">
            {PORCOES_REFERENCIA.map((p) => (
              <li key={p.item}>
                <span className="font-medium">{p.item}:</span> {p.porcao}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border border-neutral-200 bg-white p-4 text-sm text-neutral-700 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300">
          <h3 className="mb-2 font-medium text-neutral-900 dark:text-neutral-100">
            Cardápio
          </h3>
          <p className="mb-1 font-medium">Café da manhã</p>
          <ul className="mb-2 list-inside list-disc space-y-0.5">
            {CARDAPIO_REFERENCIA.cafeDaManha.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <p className="mb-1 font-medium">Jantar</p>
          <ul className="mb-2 list-inside list-disc space-y-0.5">
            {CARDAPIO_REFERENCIA.jantar.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <p className="mb-1 font-medium">Lanche</p>
          <ul className="mb-2 list-inside list-disc space-y-0.5">
            {CARDAPIO_REFERENCIA.lanche.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <p className="text-neutral-500">{CARDAPIO_REFERENCIA.frutas}</p>
        </div>

        <details className="rounded-xl border border-neutral-200 bg-white p-4 text-sm text-neutral-700 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300">
          <summary className="cursor-pointer font-medium text-neutral-900 dark:text-neutral-100">
            Receitas
          </summary>
          <div className="mt-2 flex flex-col gap-2">
            {RECEITAS_REFERENCIA.map((r) => (
              <div key={r.categoria}>
                <p className="font-medium">{r.categoria}</p>
                <p className="text-neutral-500">{r.itens.join(" · ")}</p>
              </div>
            ))}
          </div>
        </details>

        <div className="rounded-xl border border-neutral-200 bg-white p-4 text-sm text-neutral-700 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300">
          <h3 className="mb-2 font-medium text-neutral-900 dark:text-neutral-100">
            Suplementação
          </h3>
          <ul className="space-y-1">
            {SUPLEMENTACAO.map((s) => (
              <li key={s.nome}>
                <span className="font-medium">{s.nome}:</span> {s.dose}
              </li>
            ))}
          </ul>
        </div>

        <details className="rounded-xl border border-neutral-200 bg-white p-4 text-sm text-neutral-700 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300">
          <summary className="cursor-pointer font-medium text-neutral-900 dark:text-neutral-100">
            Lista de compras recorrente
          </summary>
          <div className="mt-2 flex flex-col gap-2">
            <p>
              <span className="font-medium">Proteínas:</span>{" "}
              {LISTA_DE_COMPRAS.proteinas.join(", ")}
            </p>
            <p>
              <span className="font-medium">Carboidratos:</span>{" "}
              {LISTA_DE_COMPRAS.carboidratos.join(", ")}
            </p>
            <p>
              <span className="font-medium">Hortifruti:</span>{" "}
              {LISTA_DE_COMPRAS.hortifruti.join(", ")}
            </p>
          </div>
        </details>
      </section>
    </main>
  );
}

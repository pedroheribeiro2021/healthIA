import type { HealthEvent } from "@/domain/healthEvent";

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

const SPORT_LABELS: Record<string, string> = {
  soccer: "Futebol",
  gym: "Academia",
  run: "Corrida",
  walk: "Caminhada",
  bike: "Bike",
  other: "Outro",
};

// Leitura crua de apresentação — não passa pelo Analytics Engine, é só
// listar os últimos treinos direto de health_events.
export function WorkoutList({ events }: { events: HealthEvent[] }) {
  const sorted = [...events]
    .sort((a, b) => Date.parse(b.startTime) - Date.parse(a.startTime))
    .slice(0, 10);

  if (sorted.length === 0) {
    return <p className="text-sm text-neutral-400">Nenhum treino registrado ainda.</p>;
  }

  return (
    <ul className="w-full max-w-md divide-y divide-neutral-200 rounded-xl border border-neutral-200 bg-white dark:divide-neutral-800 dark:border-neutral-800 dark:bg-neutral-900">
      {sorted.map((event) => {
        const detail = event.detail as { sport?: string } | null;
        const sport = detail?.sport
          ? (SPORT_LABELS[detail.sport] ?? detail.sport)
          : "Treino";
        const durationMin =
          event.value !== null ? Math.round(event.value / 60) : null;

        return (
          <li key={event.id} className="flex items-center justify-between px-4 py-3 text-sm">
            <div>
              <p className="font-medium text-neutral-900 dark:text-neutral-100">{sport}</p>
              <p className="text-xs text-neutral-500">
                {dateFormatter.format(new Date(event.startTime))}
              </p>
            </div>
            {durationMin !== null && (
              <span className="text-neutral-500">{durationMin} min</span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

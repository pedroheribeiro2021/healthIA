import type { DailySummary } from "@/domain/analytics";

function formatDuration(seconds: number | null): string {
  if (seconds === null) return "—";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.round((seconds % 3600) / 60);
  return `${hours}h${String(minutes).padStart(2, "0")}`;
}

function Tile({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
      <p className="text-xs font-medium text-neutral-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
        {value}
      </p>
      {hint && <p className="mt-0.5 text-xs text-neutral-400">{hint}</p>}
    </div>
  );
}

// Server Component puro: recebe o daily_summary já pronto (Analytics
// Engine já rodou) e só apresenta. Nenhum cálculo aqui (CLAUDE.md).
export function OverviewCards({ summary }: { summary: DailySummary | null }) {
  if (!summary) {
    return (
      <div className="w-full max-w-md rounded-xl border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-500 dark:border-neutral-700">
        Ainda sem dados suficientes pra hoje. Sincronize o Health Connect ou
        registre manualmente.
      </div>
    );
  }

  return (
    <div className="grid w-full max-w-md grid-cols-2 gap-3">
      <Tile
        label="Recovery"
        value={
          summary.recoveryScore !== null
            ? `${Math.round(summary.recoveryScore)}`
            : "—"
        }
      />
      <Tile label="Sono" value={formatDuration(summary.sleepDurationS)} />
      <Tile
        label="FC repouso"
        value={
          summary.restingHr !== null ? `${Math.round(summary.restingHr)} bpm` : "—"
        }
      />
      <Tile
        label="Peso"
        value={summary.weightKg !== null ? `${summary.weightKg.toFixed(1)} kg` : "—"}
      />
      <Tile
        label="Treinos"
        value={summary.workouts !== null ? `${summary.workouts}` : "—"}
        hint={
          summary.trainingLoad !== null
            ? `carga ${Math.round(summary.trainingLoad)}`
            : undefined
        }
      />
      <Tile
        label="Passos"
        value={summary.steps !== null ? summary.steps.toLocaleString("pt-BR") : "—"}
      />
    </div>
  );
}

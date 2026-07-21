import type { CorrelationResult } from "@/domain/analytics";

function formatMetricId(id: string): string {
  return id.replaceAll(".", " ");
}

// Server Component puro: recebe resultados já filtrados pelo
// CorrelationFinder (n >= 14, p < 0.05 aproximado — ver
// engines/analytics/correlationFinder.ts). Não recalcula nada.
export function CorrelationList({
  correlations,
}: {
  correlations: CorrelationResult[];
}) {
  if (correlations.length === 0) {
    return (
      <div className="w-full max-w-md rounded-xl border border-dashed border-neutral-300 p-4 text-center text-sm text-neutral-500 dark:border-neutral-700">
        Ainda sem correlações estatisticamente significativas nos últimos 60
        dias.
      </div>
    );
  }

  return (
    <div className="flex w-full max-w-md flex-col gap-3">
      {correlations.map((c) => (
        <div
          key={`${c.metricA}-${c.metricB}-${c.lagDays}`}
          className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900"
        >
          <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
            {formatMetricId(c.metricA)}
            {c.lagDays > 0 ? ` (${c.lagDays}d antes)` : ""} ×{" "}
            {formatMetricId(c.metricB)}
          </p>
          <p className="mt-1 text-xs text-neutral-500">
            ρ = {c.rho.toFixed(2)} · n = {c.n}
          </p>
        </div>
      ))}
    </div>
  );
}

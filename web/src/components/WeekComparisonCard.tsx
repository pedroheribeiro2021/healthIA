import type { ComparisonResult } from "@/domain/analytics";

// Presentacional, compartilhado entre módulos Sono e Exercícios — recebe
// um ComparisonResult já calculado (engines/analytics/comparisonEngine).
// `formatValue` deixa a conversão de unidade (SI -> exibição) por conta de
// quem chama, já que cada métrica tem uma unidade diferente.
export function WeekComparisonCard({
  title,
  comparison,
  formatValue = (value) => value.toFixed(1),
}: {
  title: string;
  comparison: ComparisonResult;
  formatValue?: (value: number) => string;
}) {
  if (comparison.insufficientData) {
    return (
      <div className="w-full max-w-md rounded-xl border border-dashed border-neutral-300 p-4 text-sm text-neutral-500 dark:border-neutral-700">
        {title}: dados insuficientes pra comparar as semanas.
      </div>
    );
  }

  const meanA = comparison.meanA as number;
  const meanB = comparison.meanB as number;

  return (
    <div className="w-full max-w-md rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
      <p className="text-xs font-medium text-neutral-500">
        {title} — semana atual vs. anterior
      </p>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
          {formatValue(meanA)}
        </span>
        <span className="text-sm text-neutral-400">vs {formatValue(meanB)}</span>
      </div>
      {comparison.deltaPct !== null && (
        <p
          className={`mt-1 text-xs ${
            comparison.significant
              ? "font-medium text-neutral-900 dark:text-neutral-100"
              : "text-neutral-400"
          }`}
        >
          {comparison.deltaPct > 0 ? "+" : ""}
          {comparison.deltaPct.toFixed(1)}%
          {comparison.significant ? " (mudança notável)" : ""}
        </p>
      )}
    </div>
  );
}

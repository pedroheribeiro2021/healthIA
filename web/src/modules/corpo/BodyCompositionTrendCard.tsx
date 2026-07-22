import type { TrendResult } from "@/domain/analytics";

const TREND_LABEL: Record<TrendResult["direction"], string> = {
  up: "subindo",
  down: "caindo",
  flat: "estável",
};

// Server Component puro: recebe o valor mais recente e a tendência já
// calculada (engines/analytics/trendAnalyzer.ts) — nenhum cálculo aqui.
export function BodyCompositionTrendCard({
  label,
  latestValue,
  unit,
  trend,
}: {
  label: string;
  latestValue: number | null;
  unit: string;
  trend: TrendResult;
}) {
  return (
    <div className="w-full max-w-md rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
      <p className="text-xs font-medium text-neutral-500">{label}</p>
      <p className="mt-1 text-xl font-semibold text-neutral-900 dark:text-neutral-100">
        {latestValue !== null ? `${latestValue.toFixed(1)}${unit}` : "—"}
      </p>
      {!trend.insufficientData && (
        <p className="mt-1 text-xs text-neutral-400">
          Tendência: {TREND_LABEL[trend.direction]}
        </p>
      )}
    </div>
  );
}

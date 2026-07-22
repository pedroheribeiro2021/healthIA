import type { Report } from "@/domain/reports";
import { formatGoalValue } from "@/modules/metas/formatGoalValue";
import { GOAL_METRIC_DEFS } from "@/engines/goals/goalMetrics";
import { formatReportValue } from "./formatReportValue";

const TREND_ARROW: Record<Report["metrics"][number]["trendDirection"], string> = {
  up: "↑",
  down: "↓",
  flat: "→",
};

function MetricCard({ metric }: { metric: Report["metrics"][number] }) {
  const { comparison } = metric;

  if (comparison.insufficientData) {
    return (
      <div className="w-full max-w-md rounded-xl border border-dashed border-neutral-300 p-4 text-sm text-neutral-500 dark:border-neutral-700">
        {metric.label}: dados insuficientes pra comparar os períodos.
      </div>
    );
  }

  const meanCurrent = comparison.meanA as number;
  const meanPrevious = comparison.meanB as number;

  return (
    <div className="w-full max-w-md rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
      <p className="text-xs font-medium text-neutral-500">{metric.label}</p>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
          {formatReportValue(metric.key, meanCurrent)}
        </span>
        <span className="text-sm text-neutral-400">
          vs {formatReportValue(metric.key, meanPrevious)}
        </span>
        <span className="text-sm text-neutral-400">
          {TREND_ARROW[metric.trendDirection]}
        </span>
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

export function ReportView({ report }: { report: Report }) {
  return (
    <div className="flex w-full max-w-md flex-col gap-6">
      <section className="flex flex-col gap-3">
        {report.metrics.map((metric) => (
          <MetricCard key={metric.key} metric={metric} />
        ))}
      </section>

      {report.goals.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-medium text-neutral-500">
            Progresso das metas
          </h2>
          {report.goals.map(({ goal, currentValue }) => (
            <div
              key={goal.id}
              className="w-full rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900"
            >
              <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                {GOAL_METRIC_DEFS[goal.metricId]?.label ?? goal.metricId}
              </p>
              <p className="mt-1 text-xs text-neutral-500">
                Atual:{" "}
                {currentValue !== null
                  ? formatGoalValue(goal.metricId, currentValue)
                  : "sem dado suficiente"}{" "}
                · Meta: {formatGoalValue(goal.metricId, goal.targetValue)}
              </p>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}

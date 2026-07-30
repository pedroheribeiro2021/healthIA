import Link from "next/link";
import type { Insight, InsightSeverity } from "@/domain/insights";

const SEVERITY_LABEL: Record<InsightSeverity, string> = {
  alert: "Alerta",
  attention: "Atenção",
  info: "Info",
};

const SEVERITY_CLASS: Record<InsightSeverity, string> = {
  alert:
    "border-red-300 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300",
  attention:
    "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300",
  info: "border-neutral-200 bg-white text-neutral-700 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300",
};

// Server Component puro: recebe insights já calculados e persistidos pelo
// Insight Engine (engines/insights/) — nenhuma regra é avaliada aqui.
export function InsightList({ insights }: { insights: Insight[] }) {
  if (insights.length === 0) {
    return (
      <div className="w-full max-w-md rounded-xl border border-dashed border-neutral-300 p-4 text-center text-sm text-neutral-500 dark:border-neutral-700">
        Nenhum insight nos últimos 30 dias.
      </div>
    );
  }

  return (
    <div className="flex w-full max-w-md flex-col gap-3">
      {insights.map((insight) => (
        <div
          key={insight.id}
          className={`rounded-xl border p-4 ${SEVERITY_CLASS[insight.severity]}`}
        >
          <p className="text-xs font-medium uppercase tracking-wide opacity-70">
            {SEVERITY_LABEL[insight.severity]}
          </p>
          <p className="mt-1 text-sm font-semibold">{insight.title}</p>
          <p className="mt-1 text-xs opacity-80">{insight.body}</p>
          <Link
            href={`/chat?q=${encodeURIComponent(`Por que o insight "${insight.title}" apareceu? Explique com os números reais.`)}`}
            className="mt-2 inline-block text-xs font-medium underline opacity-70 hover:opacity-100"
          >
            Perguntar à IA →
          </Link>
        </div>
      ))}
    </div>
  );
}

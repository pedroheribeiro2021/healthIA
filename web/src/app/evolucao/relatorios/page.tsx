import Link from "next/link";
import { reportKindSchema } from "@/domain/reports";
import { todayLocalDay } from "@/engines/analytics/period";
import { generateReport } from "@/engines/reports/reportService";
import { ReportView } from "@/modules/relatorios/ReportView";
import { createSupabaseGoalRepository } from "@/repositories/goalRepository";
import { createSupabaseMetricRepository } from "@/repositories/metricRepository";

export default async function RelatoriosPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const { type } = await searchParams;
  const kind = reportKindSchema.catch("weekly").parse(type);

  const [metricRepo, goalRepo] = await Promise.all([
    createSupabaseMetricRepository(),
    createSupabaseGoalRepository(),
  ]);
  const report = await generateReport(metricRepo, goalRepo, kind, todayLocalDay());

  return (
    <main className="flex flex-1 flex-col items-center gap-6 bg-neutral-50 px-6 py-8 pb-20 dark:bg-neutral-950">
      <h1 className="w-full max-w-md text-lg font-semibold text-neutral-900 dark:text-neutral-100">
        Relatórios
      </h1>

      <div className="flex w-full max-w-md gap-2">
        <Link
          href="/relatorios?type=weekly"
          className={`rounded-md px-3 py-1.5 text-sm font-medium ${
            kind === "weekly"
              ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900"
              : "border border-neutral-300 text-neutral-700 dark:border-neutral-700 dark:text-neutral-300"
          }`}
        >
          Semanal
        </Link>
        <Link
          href="/relatorios?type=monthly"
          className={`rounded-md px-3 py-1.5 text-sm font-medium ${
            kind === "monthly"
              ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900"
              : "border border-neutral-300 text-neutral-700 dark:border-neutral-700 dark:text-neutral-300"
          }`}
        >
          Mensal
        </Link>
      </div>

      <ReportView report={report} />
    </main>
  );
}

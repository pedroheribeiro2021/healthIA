import type { LocalDay } from "@/domain/analytics";
import type { Report, ReportKind } from "@/domain/reports";
import type { GoalRepository, MetricRepository } from "@/domain/repositories";
import { addDays, localDayBounds } from "@/engines/analytics/period";
import { listGoalsWithProgress } from "@/engines/goals/goalService";
import { buildReport } from "./reportBuilder";

const WINDOW_DAYS: Record<ReportKind, number> = { weekly: 7, monthly: 30 };

// I/O (busca via repositórios) + cálculo puro (reportBuilder.buildReport) —
// mesmo formato de recommendationService/insightService.
export async function generateReport(
  metricRepo: MetricRepository,
  goalRepo: GoalRepository,
  kind: ReportKind,
  today: LocalDay,
): Promise<Report> {
  const windowDays = WINDOW_DAYS[kind];

  const currentFrom = addDays(today, -(windowDays - 1));
  const previousTo = addDays(currentFrom, -1);
  const previousFrom = addDays(previousTo, -(windowDays - 1));

  const periodCurrent = {
    start: localDayBounds(currentFrom).start,
    end: localDayBounds(today).end,
  };
  const periodPrevious = {
    start: localDayBounds(previousFrom).start,
    end: localDayBounds(previousTo).end,
  };

  const [summariesCurrent, summariesPrevious, goals] = await Promise.all([
    metricRepo.listDailySummaries({ from: currentFrom, to: today }),
    metricRepo.listDailySummaries({ from: previousFrom, to: previousTo }),
    listGoalsWithProgress(goalRepo, metricRepo, today),
  ]);

  const reportData = buildReport(
    kind,
    periodCurrent,
    periodPrevious,
    summariesCurrent,
    summariesPrevious,
    goals.filter((g) => g.goal.active),
  );

  return { ...reportData, generatedAt: new Date().toISOString() };
}

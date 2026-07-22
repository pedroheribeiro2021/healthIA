import type { DailySummary, Period, TimeSeries } from "@/domain/analytics";
import type { Report, ReportKind, ReportMetric } from "@/domain/reports";
import { compare } from "@/engines/analytics/comparisonEngine";
import { analyzeTrend } from "@/engines/analytics/trendAnalyzer";
import type { GoalWithProgress } from "@/engines/goals/goalService";

type ReportFieldConfig = {
  key: keyof DailySummary;
  label: string;
};

// Campos de daily_summary resumidos no relatório — mesma fonte que já
// alimenta o dashboard (docs/DATA_MODEL.md), nada novo é calculado aqui.
const REPORT_FIELDS: readonly ReportFieldConfig[] = [
  { key: "recoveryScore", label: "Recovery Score" },
  { key: "sleepDurationS", label: "Duração do sono" },
  { key: "restingHr", label: "FC de repouso" },
  { key: "hrvRmssd", label: "HRV (RMSSD)" },
  { key: "trainingLoad", label: "Carga de treino" },
  { key: "weightKg", label: "Peso" },
  { key: "proteinG", label: "Proteína" },
  { key: "kcalIn", label: "Calorias consumidas" },
  { key: "waterL", label: "Hidratação" },
  { key: "steps", label: "Passos" },
] as const;

function toSeries(summaries: DailySummary[], key: keyof DailySummary): TimeSeries {
  return summaries.map((s) => ({
    day: s.day,
    value: (s[key] as number | null) ?? null,
  }));
}

export type ReportData = Omit<Report, "generatedAt">;

// Puro: reaproveita compare() e analyzeTrend() (Analytics Engine, Fase 3/4)
// por campo — o relatório só organiza a saída, não introduz nenhum cálculo
// novo (docs/ARCHITECTURE.md: "Analytics antes de IA").
export function buildReport(
  kind: ReportKind,
  periodCurrent: Period,
  periodPrevious: Period,
  summariesCurrent: DailySummary[],
  summariesPrevious: DailySummary[],
  goals: GoalWithProgress[],
): ReportData {
  const metrics: ReportMetric[] = REPORT_FIELDS.map(({ key, label }) => {
    const seriesCurrent = toSeries(summariesCurrent, key);
    const seriesPrevious = toSeries(summariesPrevious, key);
    const comparison = compare(key, periodCurrent, seriesCurrent, periodPrevious, seriesPrevious);
    const trend = analyzeTrend(seriesCurrent);

    return {
      key,
      label,
      comparison,
      trendDirection: trend.direction,
      trendConfidence: trend.confidence,
    };
  });

  return {
    kind,
    periodCurrent,
    periodPrevious,
    metrics,
    goals,
  };
}

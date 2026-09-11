import type { MetricResult, Period } from "@/domain/analytics";
import type { HealthEvent } from "@/domain/healthEvent";
import { isWithinPeriod } from "../period";

const ALGO_VERSION = "v1";

// Soma, não média: kcal/proteína/água são quantidades consumidas ao longo
// do dia, não medições repetidas da mesma grandeza (diferente de
// peso/FC/HRV, que usam mean() em stats/basic.ts). Sem eventos no dia,
// null — mesma convenção do resto do Analytics Engine (0 significaria
// "consumiu zero", que é uma afirmação diferente de "não registrou nada").
function sum(xs: number[]): number | null {
  if (xs.length === 0) return null;
  return xs.reduce((total, x) => total + x, 0);
}

function detailNumber(event: HealthEvent, key: string): number | null {
  const detail = event.detail as Record<string, unknown> | null;
  const value = detail?.[key];
  return typeof value === "number" ? value : null;
}

// events: eventos 'meal' (qualquer janela que já contenha o período).
// value/unit = kcal da refeição (manual.ts e healthConnect.ts gravam os
// dois nesse formato — normalizeMealEntry/normalizeNutrition).
export function computeKcalInDaily(
  events: HealthEvent[],
  period: Period,
): MetricResult {
  const inWindow = events.filter(
    (e) => e.eventType === "meal" && isWithinPeriod(e.startTime, period),
  );
  const values = inWindow
    .map((e) => e.value)
    .filter((v): v is number => v !== null);

  return {
    metricId: "nutrition.kcal.daily",
    periodStart: period.start,
    periodEnd: period.end,
    value: sum(values),
    detail: { n: values.length },
    algoVersion: ALGO_VERSION,
  };
}

// events: eventos 'meal'. Proteína vive em detail.proteinG (kcal usa o
// value/unit do evento; os outros macros — proteína/carbo/gordura — vivem
// só no detail, ver normalization/manual.ts).
export function computeProteinDaily(
  events: HealthEvent[],
  period: Period,
): MetricResult {
  const inWindow = events.filter(
    (e) => e.eventType === "meal" && isWithinPeriod(e.startTime, period),
  );
  const values = inWindow
    .map((e) => detailNumber(e, "proteinG"))
    .filter((v): v is number => v !== null);

  return {
    metricId: "nutrition.protein.daily",
    periodStart: period.start,
    periodEnd: period.end,
    value: sum(values),
    detail: { n: values.length },
    algoVersion: ALGO_VERSION,
  };
}

// events: eventos 'hydration' (value/unit = litros, ver
// normalization/manual.ts e o botão de água do check-in em CheckinCard.tsx).
export function computeWaterDaily(
  events: HealthEvent[],
  period: Period,
): MetricResult {
  const inWindow = events.filter(
    (e) => e.eventType === "hydration" && isWithinPeriod(e.startTime, period),
  );
  const values = inWindow
    .map((e) => e.value)
    .filter((v): v is number => v !== null);

  return {
    metricId: "nutrition.water.daily",
    periodStart: period.start,
    periodEnd: period.end,
    value: sum(values),
    detail: { n: values.length },
    algoVersion: ALGO_VERSION,
  };
}

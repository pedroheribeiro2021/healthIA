import type { MetricResult, Period } from "@/domain/analytics";
import type { HealthEvent } from "@/domain/healthEvent";
import { isWithinPeriod } from "../period";
import { mean } from "../stats/basic";

const ALGO_VERSION = "v1";

function detailNumber(event: HealthEvent, key: string): number | null {
  const detail = event.detail as Record<string, unknown> | null;
  const value = detail?.[key];
  return typeof value === "number" ? value : null;
}

// Combina eventos de qualquer origem (relógio ou bioimpedância clínica —
// `detail.origin`) num único valor diário. O comparativo relógio × balança
// em si é presentacional (módulo Corpo lê os eventos brutos separados por
// origem), não um indicador calculado.
export function computeBodyFatPctDaily(
  events: HealthEvent[],
  period: Period,
): MetricResult {
  const inWindow = events.filter(
    (e) => e.eventType === "body_composition" && isWithinPeriod(e.startTime, period),
  );
  const values = inWindow
    .map((e) => detailNumber(e, "bodyFatPercentage"))
    .filter((v): v is number => v !== null);

  return {
    metricId: "body.fatpct.daily",
    periodStart: period.start,
    periodEnd: period.end,
    value: mean(values),
    detail: { n: values.length },
    algoVersion: ALGO_VERSION,
  };
}

// Só a bioimpedância clínica reporta massa magra (o BodyFatRecord do
// Health Connect só tem percentual — ver normalization/healthConnect.ts).
export function computeLeanMassDaily(
  events: HealthEvent[],
  period: Period,
): MetricResult {
  const inWindow = events.filter(
    (e) => e.eventType === "body_composition" && isWithinPeriod(e.startTime, period),
  );
  const values = inWindow
    .map((e) => detailNumber(e, "leanMassKg"))
    .filter((v): v is number => v !== null);

  return {
    metricId: "body.leanmass.daily",
    periodStart: period.start,
    periodEnd: period.end,
    value: mean(values),
    detail: { n: values.length },
    algoVersion: ALGO_VERSION,
  };
}

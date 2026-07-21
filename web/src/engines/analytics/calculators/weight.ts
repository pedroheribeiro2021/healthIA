import type { MetricResult, Period } from "@/domain/analytics";
import type { HealthEvent } from "@/domain/healthEvent";
import { isWithinPeriod } from "../period";
import { mean } from "../stats/basic";

const ALGO_VERSION = "v1";

// events: eventos 'weight' (qualquer janela que já contenha o período).
export function computeWeightDaily(
  events: HealthEvent[],
  period: Period,
): MetricResult {
  const inWindow = events.filter(
    (e) => e.eventType === "weight" && isWithinPeriod(e.startTime, period),
  );

  const values = inWindow
    .map((e) => e.value)
    .filter((v): v is number => v !== null);

  return {
    metricId: "body.weight.daily",
    periodStart: period.start,
    periodEnd: period.end,
    value: mean(values),
    detail: { n: values.length },
    algoVersion: ALGO_VERSION,
  };
}

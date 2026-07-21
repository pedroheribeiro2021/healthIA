import type { MetricResult, Period } from "@/domain/analytics";
import type { HealthEvent } from "@/domain/healthEvent";
import { isWithinPeriod } from "../period";
import { mean } from "../stats/basic";

const ALGO_VERSION = "v1";

// Nenhum sync real trouxe HeartRateVariabilityRmssd ainda (Galaxy Watch 8 /
// primeiro sync não capturou esse tipo) — sempre retorna null em produção
// hoje. Implementado e testado com fixtures sintéticas para já estar
// pronto quando o sync-app passar a enviar HRV.
export function computeHrvRmssdDaily(
  events: HealthEvent[],
  period: Period,
): MetricResult {
  const inWindow = events.filter(
    (e) => e.eventType === "hrv" && isWithinPeriod(e.startTime, period),
  );
  const values = inWindow
    .map((e) => e.value)
    .filter((v): v is number => v !== null);

  return {
    metricId: "hrv.rmssd.daily",
    periodStart: period.start,
    periodEnd: period.end,
    value: mean(values),
    detail: { n: values.length },
    algoVersion: ALGO_VERSION,
  };
}

import type { MetricResult, Period } from "@/domain/analytics";
import type { HealthEvent } from "@/domain/healthEvent";
import { isWithinPeriod } from "../period";

const ALGO_VERSION = "v1";

// Health Connect não expõe um tipo de registro dedicado a FC de repouso —
// só amostras contínuas de heart_rate. v1: mínimo de FC dentro da janela
// da sessão de sono do dia (proxy razoável de repouso); sem sessão de sono
// ou sem amostra na janela, cai pro mínimo do dia inteiro.
export function computeRestingHrDaily(
  events: HealthEvent[],
  period: Period,
): MetricResult {
  const heartRateSamples = events.filter((e) => e.eventType === "heart_rate");
  const sleepSessions = events.filter(
    (e) =>
      e.eventType === "sleep_session" &&
      e.endTime !== null &&
      isWithinPeriod(e.endTime, period),
  );

  let candidates: HealthEvent[] = [];
  let source: "sleep_window" | "full_day_fallback" = "full_day_fallback";

  if (sleepSessions.length > 0) {
    const longest = sleepSessions.reduce((best, s) =>
      (s.value ?? 0) > (best.value ?? 0) ? s : best,
    );
    const sleepWindow: Period = {
      start: longest.startTime,
      end: longest.endTime as string,
    };
    candidates = heartRateSamples.filter((e) =>
      isWithinPeriod(e.startTime, sleepWindow),
    );
    if (candidates.length > 0) source = "sleep_window";
  }

  if (candidates.length === 0) {
    candidates = heartRateSamples.filter((e) =>
      isWithinPeriod(e.startTime, period),
    );
    source = "full_day_fallback";
  }

  const values = candidates
    .map((e) => e.value)
    .filter((v): v is number => v !== null);
  const value = values.length > 0 ? Math.min(...values) : null;

  return {
    metricId: "hr.resting.daily",
    periodStart: period.start,
    periodEnd: period.end,
    value,
    detail: value !== null ? { source, n: values.length } : { missing: true },
    algoVersion: ALGO_VERSION,
  };
}

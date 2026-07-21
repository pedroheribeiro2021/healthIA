import type { MetricResult, Period } from "@/domain/analytics";
import type { HealthEvent } from "@/domain/healthEvent";
import { isWithinPeriod } from "../period";
import { mean } from "../stats/basic";

const ALGO_VERSION = "v1";

type SleepDetail = {
  deepS?: number | null;
  remS?: number | null;
  lightS?: number | null;
  awakeS?: number | null;
};

// Uma sessão de sono é atribuída ao dia local em que a pessoa acordou
// (end_time), não em que deitou — é o dia sobre o qual "como dormi essa
// noite" faz sentido responder. Com mais de uma sessão no dia (soneca +
// sono principal), usa a de maior duração; as demais ficam registradas em
// detail.otherSessions para não perder o dado.
function findSleepSessionForDay(
  events: HealthEvent[],
  period: Period,
): { session: HealthEvent; otherSessions: number } | null {
  const sessions = events.filter(
    (e) =>
      e.eventType === "sleep_session" &&
      e.endTime !== null &&
      isWithinPeriod(e.endTime, period),
  );
  if (sessions.length === 0) return null;

  const longest = sessions.reduce((best, s) =>
    (s.value ?? 0) > (best.value ?? 0) ? s : best,
  );
  return { session: longest, otherSessions: sessions.length - 1 };
}

export function computeSleepDurationDaily(
  events: HealthEvent[],
  period: Period,
): MetricResult {
  const found = findSleepSessionForDay(events, period);

  return {
    metricId: "sleep.duration.daily",
    periodStart: period.start,
    periodEnd: period.end,
    value: found?.session.value ?? null,
    detail: found
      ? { otherSessions: found.otherSessions }
      : { missing: "no_sleep_session" },
    algoVersion: ALGO_VERSION,
  };
}

export function computeSleepEfficiencyDaily(
  events: HealthEvent[],
  period: Period,
): MetricResult {
  const found = findSleepSessionForDay(events, period);
  if (!found || found.session.value === null) {
    return {
      metricId: "sleep.efficiency.daily",
      periodStart: period.start,
      periodEnd: period.end,
      value: null,
      detail: { missing: "no_sleep_session" },
      algoVersion: ALGO_VERSION,
    };
  }

  const durationS = found.session.value;
  const detail = (found.session.detail ?? {}) as SleepDetail;
  const awakeS = detail.awakeS ?? 0;
  const efficiency = clamp01((durationS - awakeS) / durationS);

  return {
    metricId: "sleep.efficiency.daily",
    periodStart: period.start,
    periodEnd: period.end,
    value: efficiency,
    detail: { durationS, awakeS },
    algoVersion: ALGO_VERSION,
  };
}

// Horário médio de dormir dos últimos 7 dias. Converte start_time para
// "minutos desde o meio-dia local" (em vez de minutos desde meia-noite) —
// desloca a referência pro lado oposto do relógio de onde caem horários
// típicos de dormir (22h-03h), evitando o problema de virada de meia-noite
// numa média simples (23:30 e 00:30 ficariam em lados opostos da escala).
function minutesSinceLocalNoon(isoInstant: string): number {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = formatter.formatToParts(new Date(isoInstant));
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0") % 24;
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  const totalMinutes = hour * 60 + minute;
  return totalMinutes >= 12 * 60 ? totalMinutes - 12 * 60 : totalMinutes + 12 * 60;
}

function formatFromMinutesSinceNoon(minutes: number): string {
  const totalMinutes =
    minutes < 12 * 60 ? minutes + 12 * 60 : minutes - 12 * 60;
  const hour = Math.floor(totalMinutes / 60) % 24;
  const minute = Math.round(totalMinutes % 60);
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export function computeSleepBedtimeAvg7d(
  events: HealthEvent[],
  period: Period,
): MetricResult {
  const sessions = events.filter(
    (e) =>
      e.eventType === "sleep_session" &&
      e.endTime !== null &&
      isWithinPeriod(e.endTime, period),
  );

  if (sessions.length === 0) {
    return {
      metricId: "sleep.bedtime.avg7d",
      periodStart: period.start,
      periodEnd: period.end,
      value: null,
      detail: { missing: "no_sleep_session", n: 0 },
      algoVersion: ALGO_VERSION,
    };
  }

  const minutesSinceNoon = sessions.map((s) =>
    minutesSinceLocalNoon(s.startTime),
  );
  const avgMinutesSinceNoon = mean(minutesSinceNoon) as number;

  return {
    metricId: "sleep.bedtime.avg7d",
    periodStart: period.start,
    periodEnd: period.end,
    value: avgMinutesSinceNoon,
    detail: {
      n: sessions.length,
      bedtimeLabel: formatFromMinutesSinceNoon(avgMinutesSinceNoon),
    },
    algoVersion: ALGO_VERSION,
  };
}

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

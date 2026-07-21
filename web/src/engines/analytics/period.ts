import type { LocalDay, Period } from "@/domain/analytics";

const TIMEZONE = "America/Sao_Paulo";
// Brasil aboliu horário de verão em 2019 — offset fixo -03:00. Se isso
// mudar, os limites de dia local abaixo precisam de cálculo de offset
// dinâmico em vez de uma string fixa.
const FIXED_OFFSET = "-03:00";

const localDayFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function assertSupportedTimezone(tz: string): void {
  if (tz !== TIMEZONE) {
    throw new Error(`timezone não suportada: ${tz}`);
  }
}

// Dia local (America/Sao_Paulo) a que um instante pertence.
export function toLocalDay(isoInstant: string, tz = TIMEZONE): LocalDay {
  assertSupportedTimezone(tz);
  return localDayFormatter.format(new Date(isoInstant)) as LocalDay;
}

// Início (inclusive) e fim (exclusive) em UTC de um dia local.
export function localDayBounds(day: LocalDay, tz = TIMEZONE): Period {
  assertSupportedTimezone(tz);
  const start = new Date(`${day}T00:00:00${FIXED_OFFSET}`);
  const end = new Date(`${addDays(day, 1)}T00:00:00${FIXED_OFFSET}`);
  return { start: start.toISOString(), end: end.toISOString() };
}

// Aritmética de calendário pura (Y-M-D), independente de timezone.
export function addDays(day: LocalDay, n: number): LocalDay {
  const [year, month, date] = day.split("-").map(Number);
  const utcDate = new Date(Date.UTC(year, month - 1, date));
  utcDate.setUTCDate(utcDate.getUTCDate() + n);
  return utcDate.toISOString().slice(0, 10);
}

// Últimos `n` dias terminando em `day` (inclusive), ordem ascendente.
export function lastNDays(day: LocalDay, n: number): LocalDay[] {
  return Array.from({ length: n }, (_, i) => addDays(day, -(n - 1 - i)));
}

export function todayLocalDay(tz = TIMEZONE): LocalDay {
  return toLocalDay(new Date().toISOString(), tz);
}

// Todos os dias entre from e to (inclusive nos dois extremos), ascendente.
export function daysBetween(from: LocalDay, to: LocalDay): LocalDay[] {
  const days: LocalDay[] = [];
  let day = from;
  while (day <= to) {
    days.push(day);
    day = addDays(day, 1);
  }
  return days;
}

// [period.start, period.end) — mesma convenção de localDayBounds.
export function isWithinPeriod(isoInstant: string, period: Period): boolean {
  const t = Date.parse(isoInstant);
  return t >= Date.parse(period.start) && t < Date.parse(period.end);
}

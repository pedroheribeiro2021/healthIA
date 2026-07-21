import type { LocalDay, MetricSnapshot, TimeSeries } from "@/domain/analytics";
import { localDayBounds } from "./period";
import { mean } from "./stats/basic";

// Constrói uma série diária a partir de snapshots já persistidos — dia
// sem snapshot ainda computado vira value: null.
//
// Chave do Map é o instante em milissegundos (Date.parse), não a string
// crua: o Postgres/PostgREST devolve period_start como
// "2026-07-21T03:00:00+00:00", enquanto localDayBounds gera
// "2026-07-21T03:00:00.000Z" (toISOString) — mesmo instante, strings
// diferentes. Comparar string a string nunca batia (bug real encontrado
// testando com dado de produção).
export function seriesFromDailySnapshots(
  snapshots: MetricSnapshot[],
  days: LocalDay[],
): TimeSeries {
  const byPeriodStart = new Map(
    snapshots.map((s) => [Date.parse(s.periodStart), s.value]),
  );
  return days.map((day) => ({
    day,
    value: byPeriodStart.get(Date.parse(localDayBounds(day).start)) ?? null,
  }));
}

// Média de uma série diária ignorando pontos sem dado (value: null) —
// reusado por avg7d/avg30d/baseline60d de sono, peso, FC repouso e HRV em
// vez de reimplementar "média com janela" em cada calculator.
export function averageOverWindow(series: TimeSeries): {
  value: number | null;
  n: number;
} {
  const values = series
    .map((point) => point.value)
    .filter((v): v is number => v !== null);
  return { value: mean(values), n: values.length };
}

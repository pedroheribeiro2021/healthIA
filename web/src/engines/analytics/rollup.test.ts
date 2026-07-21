import { describe, expect, it } from "vitest";
import type { MetricSnapshot } from "@/domain/analytics";
import { averageOverWindow, seriesFromDailySnapshots } from "./rollup";

describe("averageOverWindow", () => {
  it("ignora pontos com value null", () => {
    const result = averageOverWindow([
      { day: "2026-07-18", value: 10 },
      { day: "2026-07-19", value: null },
      { day: "2026-07-20", value: 20 },
    ]);
    expect(result).toEqual({ value: 15, n: 2 });
  });

  it("retorna value null e n=0 sem nenhum ponto com dado", () => {
    const result = averageOverWindow([
      { day: "2026-07-18", value: null },
      { day: "2026-07-19", value: null },
    ]);
    expect(result).toEqual({ value: null, n: 0 });
  });
});

describe("seriesFromDailySnapshots", () => {
  it("casa snapshots com o dia certo mesmo quando periodStart vem no formato +00:00 do PostgREST (não .000Z)", () => {
    // Regressão: o Postgres/PostgREST devolve timestamptz como
    // "...+00:00", enquanto localDayBounds gera "...Z" via toISOString().
    // Comparar as duas strings direto nunca batia — só apareceu testando
    // contra o banco real, os testes com fixture em memória mascaravam
    // porque preservavam o formato exato que a gente mesma escrevia.
    const snapshots: MetricSnapshot[] = [
      {
        id: 1,
        metricId: "recovery.score.daily",
        periodStart: "2026-07-21T03:00:00+00:00",
        periodEnd: "2026-07-22T03:00:00+00:00",
        value: 88.5,
        detail: null,
        algoVersion: "recovery-1",
        computedAt: "2026-07-21T04:00:00+00:00",
      },
    ];

    const series = seriesFromDailySnapshots(snapshots, ["2026-07-21"]);
    expect(series).toEqual([{ day: "2026-07-21", value: 88.5 }]);
  });

  it("dia sem snapshot correspondente vira value: null", () => {
    const series = seriesFromDailySnapshots([], ["2026-07-21"]);
    expect(series).toEqual([{ day: "2026-07-21", value: null }]);
  });
});

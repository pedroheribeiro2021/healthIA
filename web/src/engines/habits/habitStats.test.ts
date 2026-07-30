import { describe, expect, it } from "vitest";
import type { Habit, HabitLog } from "@/domain/habits";
import {
  computeStreak,
  countDoneInDays,
  daysOfIsoWeek,
  isoWeekStart,
  weeklyTargetAlreadyMetBeforeDay,
} from "./habitStats";

function log(day: string, done = true): HabitLog {
  return { id: 1, habitId: 1, day, done, quantity: null, note: null, loggedAt: `${day}T12:00:00.000Z` };
}

function habit(overrides: Partial<Habit> = {}): Habit {
  return {
    id: 1,
    slug: "escadas",
    name: "Escadas",
    category: "treino",
    kind: "quantity",
    unit: "subidas",
    targetPerDay: 5,
    targetPerWeek: 3,
    sourceKind: "manual_log",
    priority: "core",
    sortOrder: 0,
    active: true,
    createdAt: "2026-07-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("computeStreak", () => {
  it("conta dias consecutivos com done=true terminando em uptoDay", () => {
    const logs = [log("2026-07-18"), log("2026-07-19"), log("2026-07-20")];
    expect(computeStreak(logs, "2026-07-20")).toBe(3);
  });

  it("para no primeiro dia sem done", () => {
    const logs = [log("2026-07-17"), log("2026-07-19"), log("2026-07-20")];
    expect(computeStreak(logs, "2026-07-20")).toBe(2);
  });

  it("retorna 0 quando uptoDay não está marcado", () => {
    const logs = [log("2026-07-19")];
    expect(computeStreak(logs, "2026-07-20")).toBe(0);
  });

  it("ignora logs com done=false", () => {
    const logs = [log("2026-07-19", false), log("2026-07-20")];
    expect(computeStreak(logs, "2026-07-20")).toBe(1);
  });
});

describe("countDoneInDays", () => {
  it("conta só os dias done dentro da janela informada", () => {
    const logs = [log("2026-07-14"), log("2026-07-16", false), log("2026-07-18"), log("2026-07-22")];
    const days = ["2026-07-14", "2026-07-15", "2026-07-16", "2026-07-17", "2026-07-18"];
    expect(countDoneInDays(logs, days)).toBe(2);
  });
});

describe("isoWeekStart / daysOfIsoWeek", () => {
  it("segunda-feira retorna ela mesma", () => {
    // 2026-07-20 é uma segunda-feira
    expect(isoWeekStart("2026-07-20")).toBe("2026-07-20");
  });

  it("domingo retorna a segunda anterior", () => {
    expect(isoWeekStart("2026-07-26")).toBe("2026-07-20");
  });

  it("daysOfIsoWeek devolve os 7 dias seg-dom", () => {
    expect(daysOfIsoWeek("2026-07-23")).toEqual([
      "2026-07-20",
      "2026-07-21",
      "2026-07-22",
      "2026-07-23",
      "2026-07-24",
      "2026-07-25",
      "2026-07-26",
    ]);
  });
});

describe("weeklyTargetAlreadyMetBeforeDay", () => {
  it("false pra hábito diário (target_per_week >= 7), mesmo já cumprido antes", () => {
    const daily = habit({ targetPerWeek: 7 });
    const logs = ["2026-07-20", "2026-07-21", "2026-07-22"].map((d) => log(d));
    expect(weeklyTargetAlreadyMetBeforeDay(daily, logs, "2026-07-23")).toBe(false);
  });

  it("true quando a meta semanal já foi batida antes do dia (escadas 3x, já 3 antes de quinta)", () => {
    const escadas = habit({ targetPerWeek: 3 });
    // semana de 2026-07-20 (seg) a 2026-07-26 (dom); 3 ocorrências seg/ter/qua
    const logs = ["2026-07-20", "2026-07-21", "2026-07-22"].map((d) => log(d));
    expect(weeklyTargetAlreadyMetBeforeDay(escadas, logs, "2026-07-23")).toBe(true);
  });

  it("false quando ainda faltam ocorrências pra bater a meta semanal", () => {
    const escadas = habit({ targetPerWeek: 3 });
    const logs = [log("2026-07-20")];
    expect(weeklyTargetAlreadyMetBeforeDay(escadas, logs, "2026-07-23")).toBe(false);
  });

  it("não conta o próprio dia (só dias antes de `day`)", () => {
    const escadas = habit({ targetPerWeek: 3 });
    const logs = ["2026-07-20", "2026-07-21", "2026-07-23"].map((d) => log(d));
    expect(weeklyTargetAlreadyMetBeforeDay(escadas, logs, "2026-07-23")).toBe(false);
  });
});

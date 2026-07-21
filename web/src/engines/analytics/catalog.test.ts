import { describe, expect, it } from "vitest";
import {
  getMetricCatalogEntry,
  isValidMetricId,
  METRIC_CATALOG,
} from "./catalog";

describe("METRIC_CATALOG", () => {
  it("todo metric_id segue o formato dominio.metrica.janela", () => {
    for (const entry of METRIC_CATALOG) {
      expect(entry.id).toMatch(/^[a-z]+\.[a-z]+\.[a-z0-9]+$/);
    }
  });

  it("não tem metric_id duplicado", () => {
    const ids = METRIC_CATALOG.map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("isValidMetricId", () => {
  it("aceita um id do catálogo", () => {
    expect(isValidMetricId("recovery.score.daily")).toBe(true);
  });

  it("rejeita um id fora do catálogo", () => {
    expect(isValidMetricId("nao.existe.daily")).toBe(false);
  });
});

describe("getMetricCatalogEntry", () => {
  it("retorna a entrada correta", () => {
    expect(getMetricCatalogEntry("body.weight.daily")?.requiredEventTypes).toEqual([
      "weight",
    ]);
  });

  it("retorna undefined para id desconhecido", () => {
    expect(getMetricCatalogEntry("nao.existe.daily")).toBeUndefined();
  });
});

import { describe, expect, it } from "vitest";
import { computeRecoveryScoreDaily, type RecoveryInputs } from "./recoveryScore";

const period = { start: "2026-07-20T00:00:00.000Z", end: "2026-07-21T00:00:00.000Z" };

describe("computeRecoveryScoreDaily", () => {
  it("calcula o score com todos os componentes presentes", () => {
    const inputs: RecoveryInputs = {
      hrvToday: 50,
      hrvBaseline60d: 50,
      sleepDurationS: 8 * 3600,
      sleepEfficiency: 0.9,
      rhrToday: 50,
      rhrBaseline60d: 55,
      acwr: 1.0,
    };

    const result = computeRecoveryScoreDaily(inputs, period);
    expect(result.value).toBeCloseTo(94.14, 1);
    expect(result.algoVersion).toBe("recovery-1");
  });

  it("renormaliza os pesos quando só sono e FC de repouso estão presentes (cenário real hoje)", () => {
    const inputs: RecoveryInputs = {
      hrvToday: null,
      hrvBaseline60d: null,
      sleepDurationS: 8 * 3600,
      sleepEfficiency: 0.9,
      rhrToday: 50,
      rhrBaseline60d: 55,
      acwr: null,
    };

    const result = computeRecoveryScoreDaily(inputs, period);
    expect(result.value).toBeCloseTo(94, 5);
    expect(result.detail).toMatchObject({ missing: ["hrv", "load"] });
  });

  it("retorna null quando nenhum componente está presente", () => {
    const inputs: RecoveryInputs = {
      hrvToday: null,
      hrvBaseline60d: null,
      sleepDurationS: null,
      sleepEfficiency: null,
      rhrToday: null,
      rhrBaseline60d: null,
      acwr: null,
    };

    const result = computeRecoveryScoreDaily(inputs, period);
    expect(result.value).toBeNull();
  });
});

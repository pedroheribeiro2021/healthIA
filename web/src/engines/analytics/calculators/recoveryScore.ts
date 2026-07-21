import type { MetricResult, Period } from "@/domain/analytics";

const ALGO_VERSION = "recovery-1";

const WEIGHTS = { hrv: 0.4, sleep: 0.3, rhr: 0.2, load: 0.1 } as const;

export type RecoveryInputs = {
  hrvToday: number | null;
  hrvBaseline60d: number | null;
  sleepDurationS: number | null;
  sleepEfficiency: number | null;
  rhrToday: number | null;
  rhrBaseline60d: number | null;
  acwr: number | null;
};

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

// Fórmula fixa em docs/ENGINES.md — recovery = 100 * soma ponderada dos
// componentes presentes. Componente ausente não zera o score: os pesos
// são renormalizados entre os que estão presentes (hoje, sem HRV e sem
// histórico de treino suficiente pra ACWR, é o caso comum). v1 assumida
// imperfeita — por isso algo_version = 'recovery-1', não 'v1'.
export function computeRecoveryScoreDaily(
  inputs: RecoveryInputs,
  period: Period,
): MetricResult {
  const hrvNorm =
    inputs.hrvToday !== null && inputs.hrvBaseline60d
      ? clamp01(inputs.hrvToday / inputs.hrvBaseline60d)
      : null;

  const sleepNorm =
    inputs.sleepDurationS !== null && inputs.sleepEfficiency !== null
      ? clamp01(inputs.sleepDurationS / (8 * 3600)) * inputs.sleepEfficiency
      : null;

  const rhrNorm =
    inputs.rhrToday !== null &&
    inputs.rhrBaseline60d !== null &&
    inputs.rhrToday > 0
      ? clamp01(inputs.rhrBaseline60d / inputs.rhrToday)
      : null;

  const loadNorm =
    inputs.acwr !== null ? 1 - clamp01((inputs.acwr - 0.8) / 0.7) : null;

  const components = [
    { key: "hrv", weight: WEIGHTS.hrv, norm: hrvNorm },
    { key: "sleep", weight: WEIGHTS.sleep, norm: sleepNorm },
    { key: "rhr", weight: WEIGHTS.rhr, norm: rhrNorm },
    { key: "load", weight: WEIGHTS.load, norm: loadNorm },
  ];
  const present = components
    .filter((c) => c.norm !== null)
    .map((c) => ({ ...c, norm: c.norm as number }));

  if (present.length === 0) {
    return {
      metricId: "recovery.score.daily",
      periodStart: period.start,
      periodEnd: period.end,
      value: null,
      detail: { missing: components.map((c) => c.key) },
      algoVersion: ALGO_VERSION,
    };
  }

  const totalWeight = present.reduce((sum, c) => sum + c.weight, 0);
  const value =
    100 *
    present.reduce((sum, c) => sum + (c.weight / totalWeight) * c.norm, 0);

  return {
    metricId: "recovery.score.daily",
    periodStart: period.start,
    periodEnd: period.end,
    value,
    detail: {
      components: Object.fromEntries(components.map((c) => [c.key, c.norm])),
      weightsUsed: Object.fromEntries(
        present.map((c) => [c.key, c.weight / totalWeight]),
      ),
      missing: components.filter((c) => c.norm === null).map((c) => c.key),
    },
    algoVersion: ALGO_VERSION,
  };
}

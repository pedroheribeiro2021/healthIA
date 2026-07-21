import { localDayBounds } from "@/engines/analytics/period";
import type { InsightRule } from "../types";

type LabDetail = {
  marker?: unknown;
  referenceRange?: { min?: unknown; max?: unknown };
};

// event_type 'lab_result' já existe na taxonomia (docs/DATA_MODEL.md), mas
// o pipeline de import de exames é Fase 5 — hoje `recentLabResults` sempre
// vem vazio em produção. Implementado agora (mesmo padrão do calculator de
// HRV na Fase 3) pra já funcionar quando a Fase 5 ligar os imports.
export const labOutOfRange: InsightRule = {
  ruleId: "lab_out_of_range",
  requiredMetrics: [],
  evaluate(store) {
    for (const event of store.recentLabResults) {
      const detail = event.detail as LabDetail | null;
      const marker = typeof detail?.marker === "string" ? detail.marker : null;
      const min =
        typeof detail?.referenceRange?.min === "number"
          ? detail.referenceRange.min
          : null;
      const max =
        typeof detail?.referenceRange?.max === "number"
          ? detail.referenceRange.max
          : null;
      if (marker === null || event.value === null) continue;
      const outOfRange =
        (min !== null && event.value < min) || (max !== null && event.value > max);
      if (!outOfRange) continue;

      const period = localDayBounds(store.day);
      return {
        ruleId: "lab_out_of_range",
        severity: "alert",
        title: `${marker} fora da faixa de referência`,
        body: `Seu último exame de ${marker} (${event.value}${event.unit ?? ""}) está fora da faixa de referência (${min ?? "-∞"}–${max ?? "∞"}).`,
        evidence: { marker, value: event.value, unit: event.unit, min, max },
        periodStart: period.start,
        periodEnd: period.end,
      };
    }
    return null;
  },
};

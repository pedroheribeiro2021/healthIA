import type { NewInsight } from "@/domain/insights";
import { INSIGHT_RULES } from "./rules";
import type { MetricStore } from "./types";

// Roda todas as regras contra o mesmo MetricStore e retorna só as que
// dispararam. Função pura — a persistência (dedup, insert) fica em
// insightService.ts.
export function evaluateInsightRules(store: MetricStore): NewInsight[] {
  return INSIGHT_RULES.map((rule) => rule.evaluate(store)).filter(
    (insight): insight is NewInsight => insight !== null,
  );
}

import type { DailySummary } from "@/domain/analytics";
import type { Goal } from "@/domain/goals";
import type { Insight } from "@/domain/insights";
import type { Recommendation } from "@/domain/recommendations";

export type ChatContextData = {
  recentSummaries: DailySummary[];
  activeGoals: Goal[];
  activeInsights: Insight[];
  openRecommendations: Recommendation[];
};

// Instrução fixa de docs/ENGINES.md — a IA só explica, nunca calcula.
const SYSTEM_INSTRUCTION =
  "Você é o assistente do HealthIA, um app pessoal de saúde do Pedro. " +
  "Você explica indicadores que já foram calculados pelo Analytics Engine " +
  "(nunca calcule nada sozinho). Responda sempre em português, citando " +
  "números reais dos dados fornecidos abaixo. Se o Pedro pedir um número " +
  "que não está nos dados fornecidos, diga que o sistema ainda não calcula " +
  "essa métrica — não estime nem invente.";

function fmt(value: number | null, unit = ""): string {
  return value === null ? "sem dado" : `${value.toFixed(1)}${unit}`;
}

function fmtHours(seconds: number | null): string {
  return seconds === null ? "sem dado" : `${(seconds / 3600).toFixed(1)}h`;
}

// Puro: monta só o `system` a partir de dados já buscados (ver
// engines/ai/chatService.ts pro I/O). Nunca recebe eventos brutos — só
// resumos diários, insights, recomendações e metas já calculados
// (docs/ENGINES.md: "IA nunca recebe dados brutos para calcular").
export function buildContext(data: ChatContextData): { system: string } {
  const lines: string[] = [SYSTEM_INSTRUCTION, "", "=== Dados reais (única fonte de números) ==="];

  lines.push("", `Resumo diário, últimos ${data.recentSummaries.length} dias:`);
  if (data.recentSummaries.length === 0) {
    lines.push("- nenhum dado ainda");
  }
  for (const s of data.recentSummaries) {
    lines.push(
      `- ${s.day}: recovery=${fmt(s.recoveryScore)} sono=${fmtHours(s.sleepDurationS)} ` +
        `fcRepouso=${fmt(s.restingHr, "bpm")} hrv=${fmt(s.hrvRmssd, "ms")} ` +
        `peso=${fmt(s.weightKg, "kg")} proteina=${fmt(s.proteinG, "g")} kcal=${fmt(s.kcalIn)}`,
    );
  }

  lines.push("", "Metas ativas:");
  if (data.activeGoals.length === 0) lines.push("- nenhuma meta ativa");
  for (const g of data.activeGoals) {
    lines.push(
      `- ${g.metricId}: ${g.direction} até ${g.targetValue}` +
        (g.deadline ? ` (prazo ${g.deadline})` : ""),
    );
  }

  lines.push("", "Insights ativos (últimos 30 dias):");
  if (data.activeInsights.length === 0) lines.push("- nenhum insight ativo");
  for (const i of data.activeInsights) {
    lines.push(
      `- [${i.severity}] ${i.title}: ${i.body} (evidence: ${JSON.stringify(i.evidence)})`,
    );
  }

  lines.push("", "Recomendações abertas:");
  if (data.openRecommendations.length === 0) lines.push("- nenhuma recomendação aberta");
  for (const r of data.openRecommendations) {
    lines.push(`- ${r.title}: ${r.body}`);
  }

  return { system: lines.join("\n") };
}

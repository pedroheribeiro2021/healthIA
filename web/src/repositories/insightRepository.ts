import type { SupabaseClient } from "@supabase/supabase-js";
import type { Insight, InsightSeverity, NewInsight } from "@/domain/insights";
import type { InsightRepository } from "@/domain/repositories";
import type { Database, Json } from "./supabase/databaseTypes";
import { createSupabaseServerClient } from "./supabase/serverClient";

function toInsight(row: {
  id: number;
  rule_id: string;
  severity: string;
  title: string;
  body: string;
  evidence: unknown;
  period_start: string | null;
  period_end: string | null;
  dismissed: boolean;
  created_at: string;
}): Insight {
  return {
    id: row.id,
    ruleId: row.rule_id,
    severity: row.severity as InsightSeverity,
    title: row.title,
    body: row.body,
    evidence: row.evidence as Record<string, unknown> | null,
    periodStart: row.period_start,
    periodEnd: row.period_end,
    dismissed: row.dismissed,
    createdAt: row.created_at,
  };
}

// Fábrica pura, mesmo padrão de eventRepository.ts.
export function createInsightRepositoryFromClient(
  supabase: SupabaseClient<Database, "healthia">,
): InsightRepository {
  return {
    async insertInsight(insight: NewInsight): Promise<Insight> {
      const { data, error } = await supabase
        .from("insights")
        .insert({
          rule_id: insight.ruleId,
          severity: insight.severity,
          title: insight.title,
          body: insight.body,
          evidence: insight.evidence as Json | null,
          period_start: insight.periodStart,
          period_end: insight.periodEnd,
        })
        .select()
        .single();

      if (error) throw error;
      return toInsight(data);
    },

    async findActiveByRuleAndPeriod(params): Promise<Insight | null> {
      const { data, error } = await supabase
        .from("insights")
        .select()
        .eq("rule_id", params.ruleId)
        .eq("period_start", params.periodStart)
        .eq("period_end", params.periodEnd)
        .eq("dismissed", false)
        .maybeSingle();

      if (error) throw error;
      return data ? toInsight(data) : null;
    },

    async listActive(params): Promise<Insight[]> {
      const { data, error } = await supabase
        .from("insights")
        .select()
        .eq("dismissed", false)
        .gte("created_at", params.from)
        .lte("created_at", params.to)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data.map(toInsight);
    },
  };
}

export async function createSupabaseInsightRepository(): Promise<InsightRepository> {
  const supabase = await createSupabaseServerClient();
  return createInsightRepositoryFromClient(supabase);
}

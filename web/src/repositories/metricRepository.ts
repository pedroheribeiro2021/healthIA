import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  DailySummary,
  MetricSnapshot,
  NewDailySummary,
  NewMetricSnapshot,
} from "@/domain/analytics";
import type { MetricRepository } from "@/domain/repositories";
import type { Database, Json } from "./supabase/databaseTypes";
import { createSupabaseServerClient } from "./supabase/serverClient";

function toMetricSnapshot(row: {
  id: number;
  metric_id: string;
  period_start: string;
  period_end: string;
  value: number | null;
  detail: unknown;
  algo_version: string;
  computed_at: string;
}): MetricSnapshot {
  return {
    id: row.id,
    metricId: row.metric_id,
    periodStart: row.period_start,
    periodEnd: row.period_end,
    value: row.value,
    detail: row.detail as Record<string, unknown> | null,
    algoVersion: row.algo_version,
    computedAt: row.computed_at,
  };
}

function toDailySummary(row: {
  day: string;
  sleep_duration_s: number | null;
  sleep_score: number | null;
  resting_hr: number | null;
  hrv_rmssd: number | null;
  steps: number | null;
  workouts: number | null;
  training_load: number | null;
  kcal_in: number | null;
  protein_g: number | null;
  water_l: number | null;
  weight_kg: number | null;
  recovery_score: number | null;
  computed_at: string;
}): DailySummary {
  return {
    day: row.day,
    sleepDurationS: row.sleep_duration_s,
    sleepScore: row.sleep_score,
    restingHr: row.resting_hr,
    hrvRmssd: row.hrv_rmssd,
    steps: row.steps,
    workouts: row.workouts,
    trainingLoad: row.training_load,
    kcalIn: row.kcal_in,
    proteinG: row.protein_g,
    waterL: row.water_l,
    weightKg: row.weight_kg,
    recoveryScore: row.recovery_score,
    computedAt: row.computed_at,
  };
}

// Fábrica pura, mesmo padrão de eventRepository.ts: recebe um client já
// autenticado (cookie, Bearer ou service_role) e retorna o repositório.
export function createMetricRepositoryFromClient(
  supabase: SupabaseClient<Database, "healthia">,
): MetricRepository {
  return {
    async upsertMetricSnapshots(
      snapshots: NewMetricSnapshot[],
    ): Promise<MetricSnapshot[]> {
      if (snapshots.length === 0) return [];

      const { data, error } = await supabase
        .from("metric_snapshots")
        .upsert(
          snapshots.map((snapshot) => ({
            metric_id: snapshot.metricId,
            period_start: snapshot.periodStart,
            period_end: snapshot.periodEnd,
            value: snapshot.value,
            detail: snapshot.detail as Json | null,
            algo_version: snapshot.algoVersion,
          })),
          { onConflict: "metric_id,period_start,period_end,algo_version" },
        )
        .select();

      if (error) throw error;
      return data.map(toMetricSnapshot);
    },

    async listMetricSnapshots(params): Promise<MetricSnapshot[]> {
      let query = supabase
        .from("metric_snapshots")
        .select()
        .order("period_start", { ascending: true });

      if (params.metricId) query = query.eq("metric_id", params.metricId);
      if (params.algoVersion)
        query = query.eq("algo_version", params.algoVersion);
      if (params.from) query = query.gte("period_start", params.from);
      if (params.to) query = query.lte("period_end", params.to);

      const { data, error } = await query;
      if (error) throw error;
      return data.map(toMetricSnapshot);
    },

    async upsertDailySummary(summary: NewDailySummary): Promise<DailySummary> {
      const { data, error } = await supabase
        .from("daily_summary")
        .upsert(
          {
            day: summary.day,
            sleep_duration_s: summary.sleepDurationS,
            sleep_score: summary.sleepScore,
            resting_hr: summary.restingHr,
            hrv_rmssd: summary.hrvRmssd,
            steps: summary.steps,
            workouts: summary.workouts,
            training_load: summary.trainingLoad,
            kcal_in: summary.kcalIn,
            protein_g: summary.proteinG,
            water_l: summary.waterL,
            weight_kg: summary.weightKg,
            recovery_score: summary.recoveryScore,
          },
          { onConflict: "day" },
        )
        .select()
        .single();

      if (error) throw error;
      return toDailySummary(data);
    },

    async getDailySummary(day): Promise<DailySummary | null> {
      const { data, error } = await supabase
        .from("daily_summary")
        .select()
        .eq("day", day)
        .maybeSingle();

      if (error) throw error;
      return data ? toDailySummary(data) : null;
    },

    async getLatestDailySummary(): Promise<DailySummary | null> {
      const { data, error } = await supabase
        .from("daily_summary")
        .select()
        .order("day", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data ? toDailySummary(data) : null;
    },

    async listDailySummaries(params): Promise<DailySummary[]> {
      const { data, error } = await supabase
        .from("daily_summary")
        .select()
        .gte("day", params.from)
        .lte("day", params.to)
        .order("day", { ascending: true });

      if (error) throw error;
      return data.map(toDailySummary);
    },
  };
}

// Conveniência para Server Components/rotas autenticadas por cookie de
// sessão (dashboard). A rota de cron usa createMetricRepositoryFromClient
// diretamente com o client service_role.
export async function createSupabaseMetricRepository(): Promise<MetricRepository> {
  const supabase = await createSupabaseServerClient();
  return createMetricRepositoryFromClient(supabase);
}

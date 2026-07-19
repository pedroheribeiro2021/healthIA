// Tipos do schema `healthia` no Supabase (projeto compartilhado `rachaconta`).
// Escritos à mão espelhando supabase/migrations/*_healthia_*.sql porque
// `generate_typescript_types` só enxerga o schema `public` até o schema
// `healthia` ser exposto na API do projeto (ver notas/Pendencias.md).
// Repita esse espelhamento a cada nova migration.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  healthia: {
    Tables: {
      raw_records: {
        Row: {
          id: number;
          source: string;
          record_type: string;
          external_id: string | null;
          payload: Json;
          payload_hash: string;
          device_id: string | null;
          received_at: string;
          norm_status: string;
          norm_error: string | null;
        };
        Insert: {
          source: string;
          record_type: string;
          external_id?: string | null;
          payload: Json;
          payload_hash: string;
          device_id?: string | null;
          received_at?: string;
          norm_status?: string;
          norm_error?: string | null;
        };
        Update: {
          norm_status?: string;
          norm_error?: string | null;
        };
        Relationships: [];
      };
      health_events: {
        Row: {
          id: number;
          event_type: string;
          start_time: string;
          end_time: string | null;
          value: number | null;
          unit: string | null;
          detail: Json | null;
          source: string;
          raw_record_id: number | null;
          superseded_by: number | null;
          created_at: string;
        };
        Insert: {
          event_type: string;
          start_time: string;
          end_time?: string | null;
          value?: number | null;
          unit?: string | null;
          detail?: Json | null;
          source: string;
          raw_record_id?: number | null;
          created_at?: string;
        };
        Update: {
          superseded_by?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "health_events_raw_record_id_fkey";
            columns: ["raw_record_id"];
            isOneToOne: false;
            referencedRelation: "raw_records";
            referencedColumns: ["id"];
          },
        ];
      };
      recipes: {
        Row: {
          id: number;
          name: string;
          servings: number;
          instructions: string | null;
          source: string;
          archived: boolean;
          created_at: string;
        };
        Insert: {
          name: string;
          servings?: number;
          instructions?: string | null;
          source?: string;
          archived?: boolean;
          created_at?: string;
        };
        Update: Partial<Database["healthia"]["Tables"]["recipes"]["Insert"]>;
        Relationships: [];
      };
      recipe_ingredients: {
        Row: {
          id: number;
          recipe_id: number;
          food_name: string;
          quantity: number;
          unit: string;
          kcal: number | null;
          protein_g: number | null;
          carbs_g: number | null;
          fat_g: number | null;
          micros: Json | null;
        };
        Insert: {
          recipe_id: number;
          food_name: string;
          quantity: number;
          unit: string;
          kcal?: number | null;
          protein_g?: number | null;
          carbs_g?: number | null;
          fat_g?: number | null;
          micros?: Json | null;
        };
        Update: Partial<
          Database["healthia"]["Tables"]["recipe_ingredients"]["Insert"]
        >;
        Relationships: [
          {
            foreignKeyName: "recipe_ingredients_recipe_id_fkey";
            columns: ["recipe_id"];
            isOneToOne: false;
            referencedRelation: "recipes";
            referencedColumns: ["id"];
          },
        ];
      };
      foods: {
        Row: {
          id: number;
          name: string;
          per_100g: Json;
        };
        Insert: {
          name: string;
          per_100g: Json;
        };
        Update: Partial<Database["healthia"]["Tables"]["foods"]["Insert"]>;
        Relationships: [];
      };
      shopping_list_items: {
        Row: {
          id: number;
          food_name: string;
          quantity: number | null;
          unit: string | null;
          status: string;
          origin_recipe_id: number | null;
          created_at: string;
        };
        Insert: {
          food_name: string;
          quantity?: number | null;
          unit?: string | null;
          status?: string;
          origin_recipe_id?: number | null;
          created_at?: string;
        };
        Update: Partial<
          Database["healthia"]["Tables"]["shopping_list_items"]["Insert"]
        >;
        Relationships: [
          {
            foreignKeyName: "shopping_list_items_origin_recipe_id_fkey";
            columns: ["origin_recipe_id"];
            isOneToOne: false;
            referencedRelation: "recipes";
            referencedColumns: ["id"];
          },
        ];
      };
      goals: {
        Row: {
          id: number;
          metric_id: string;
          target_value: number;
          direction: string;
          deadline: string | null;
          active: boolean;
          created_at: string;
        };
        Insert: {
          metric_id: string;
          target_value: number;
          direction: string;
          deadline?: string | null;
          active?: boolean;
          created_at?: string;
        };
        Update: Partial<Database["healthia"]["Tables"]["goals"]["Insert"]>;
        Relationships: [];
      };
      metric_snapshots: {
        Row: {
          id: number;
          metric_id: string;
          period_start: string;
          period_end: string;
          value: number | null;
          detail: Json | null;
          algo_version: string;
          computed_at: string;
        };
        Insert: {
          metric_id: string;
          period_start: string;
          period_end: string;
          value?: number | null;
          detail?: Json | null;
          algo_version: string;
          computed_at?: string;
        };
        Update: Partial<
          Database["healthia"]["Tables"]["metric_snapshots"]["Insert"]
        >;
        Relationships: [];
      };
      insights: {
        Row: {
          id: number;
          rule_id: string;
          severity: string;
          title: string;
          body: string;
          evidence: Json | null;
          period_start: string | null;
          period_end: string | null;
          dismissed: boolean;
          created_at: string;
        };
        Insert: {
          rule_id: string;
          severity: string;
          title: string;
          body: string;
          evidence?: Json | null;
          period_start?: string | null;
          period_end?: string | null;
          dismissed?: boolean;
          created_at?: string;
        };
        Update: Partial<Database["healthia"]["Tables"]["insights"]["Insert"]>;
        Relationships: [];
      };
      recommendations: {
        Row: {
          id: number;
          insight_id: number | null;
          action_type: string;
          title: string;
          body: string;
          priority: number;
          status: string;
          created_at: string;
        };
        Insert: {
          insight_id?: number | null;
          action_type: string;
          title: string;
          body: string;
          priority: number;
          status?: string;
          created_at?: string;
        };
        Update: Partial<
          Database["healthia"]["Tables"]["recommendations"]["Insert"]
        >;
        Relationships: [
          {
            foreignKeyName: "recommendations_insight_id_fkey";
            columns: ["insight_id"];
            isOneToOne: false;
            referencedRelation: "insights";
            referencedColumns: ["id"];
          },
        ];
      };
      daily_summary: {
        Row: {
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
        };
        Insert: {
          day: string;
          sleep_duration_s?: number | null;
          sleep_score?: number | null;
          resting_hr?: number | null;
          hrv_rmssd?: number | null;
          steps?: number | null;
          workouts?: number | null;
          training_load?: number | null;
          kcal_in?: number | null;
          protein_g?: number | null;
          water_l?: number | null;
          weight_kg?: number | null;
          recovery_score?: number | null;
          computed_at?: string;
        };
        Update: Partial<
          Database["healthia"]["Tables"]["daily_summary"]["Insert"]
        >;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

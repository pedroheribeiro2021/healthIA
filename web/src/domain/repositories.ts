import type {
  DailySummary,
  LocalDay,
  MetricSnapshot,
  NewDailySummary,
  NewMetricSnapshot,
} from "./analytics";
import type { Goal, NewGoalInput } from "./goals";
import type { EventType, HealthEvent, NewHealthEvent } from "./healthEvent";
import type { Insight, NewInsight } from "./insights";
import type {
  Food,
  NewRecipeIngredient,
  NewRecipeInput,
  NewShoppingListItemInput,
  Recipe,
  RecipeIngredient,
  ShoppingListItem,
  ShoppingListStatus,
} from "./nutrition";
import type { NewRecommendation, Recommendation } from "./recommendations";
import type { NewRawRecord, RawRecord } from "./rawRecord";

export type InsertRawRecordResult =
  | { status: "accepted"; record: RawRecord }
  | { status: "duplicate" };

/**
 * Única fronteira entre o app e as camadas append-only (raw_records,
 * health_events). Implementação concreta vive em repositories/eventRepository.ts.
 */
export interface EventRepository {
  insertRawRecord(record: NewRawRecord): Promise<InsertRawRecordResult>;
  listPendingRawRecords(limit?: number): Promise<RawRecord[]>;
  markRawRecordNormalized(
    id: number,
    result: { status: "done" } | { status: "error"; error: string },
  ): Promise<void>;

  insertHealthEvents(events: NewHealthEvent[]): Promise<HealthEvent[]>;
  listHealthEvents(params: {
    eventType?: EventType;
    from?: string;
    to?: string;
  }): Promise<HealthEvent[]>;
}

/**
 * Camada derivada e recalculável (docs/DATA_MODEL.md): metric_snapshots +
 * daily_summary. Implementação concreta em repositories/metricRepository.ts.
 */
export interface MetricRepository {
  upsertMetricSnapshots(
    snapshots: NewMetricSnapshot[],
  ): Promise<MetricSnapshot[]>;
  listMetricSnapshots(params: {
    metricId?: string;
    from?: string;
    to?: string;
    algoVersion?: string;
  }): Promise<MetricSnapshot[]>;

  upsertDailySummary(summary: NewDailySummary): Promise<DailySummary>;
  getDailySummary(day: LocalDay): Promise<DailySummary | null>;
  getLatestDailySummary(): Promise<DailySummary | null>;
  listDailySummaries(params: {
    from: LocalDay;
    to: LocalDay;
  }): Promise<DailySummary[]>;
}

/**
 * Metas (docs/DATA_MODEL.md `goals`). `listActiveGoals` é usado desde a
 * Fase 4 pelas regras de insight; criação/gestão é Fase 6.
 * Implementação concreta em repositories/goalRepository.ts.
 */
export interface GoalRepository {
  listActiveGoals(): Promise<Goal[]>;
  listGoals(): Promise<Goal[]>;
  createGoal(input: NewGoalInput): Promise<Goal>;
  deactivateGoal(id: number): Promise<Goal>;
}

/**
 * Camada derivada e recalculável (docs/DATA_MODEL.md `insights`).
 * Implementação concreta em repositories/insightRepository.ts.
 */
export interface InsightRepository {
  insertInsight(insight: NewInsight): Promise<Insight>;
  // Usado pelo insightService pra não duplicar o mesmo insight em
  // recomputes repetidos do mesmo dia (a tabela não tem unique constraint —
  // ver ADR da Fase 4).
  findActiveByRuleAndPeriod(params: {
    ruleId: string;
    periodStart: string;
    periodEnd: string;
  }): Promise<Insight | null>;
  listActive(params: { from: string; to: string }): Promise<Insight[]>;
}

/**
 * Camada derivada e recalculável (docs/DATA_MODEL.md `recommendations`).
 * Implementação concreta em repositories/recommendationRepository.ts.
 */
export interface RecommendationRepository {
  insertRecommendation(
    recommendation: NewRecommendation,
  ): Promise<Recommendation>;
  findOpenByInsightId(insightId: number): Promise<Recommendation | null>;
  listByStatus(status: Recommendation["status"]): Promise<Recommendation[]>;
  updateStatus(
    id: number,
    status: Recommendation["status"],
  ): Promise<Recommendation>;
}

/**
 * Base de alimentos (docs/DATA_MODEL.md `foods`) — só leitura; a base é
 * povoada por seed/migration (Fase 5), sem CRUD do usuário.
 * Implementação concreta em repositories/foodRepository.ts.
 */
export interface FoodRepository {
  searchFoods(query: string, limit?: number): Promise<Food[]>;
  getFoodById(id: number): Promise<Food | null>;
}

/**
 * Receitas + ingredientes (docs/DATA_MODEL.md `recipes`/`recipe_ingredients`).
 * Implementação concreta em repositories/recipeRepository.ts.
 */
export interface RecipeRepository {
  createRecipe(input: NewRecipeInput): Promise<Recipe>;
  listRecipes(): Promise<Recipe[]>;
  getRecipe(id: number): Promise<Recipe | null>;
  addIngredient(ingredient: NewRecipeIngredient): Promise<RecipeIngredient>;
  listIngredients(recipeId: number): Promise<RecipeIngredient[]>;
}

/**
 * Lista de compras (docs/DATA_MODEL.md `shopping_list_items`).
 * Implementação concreta em repositories/shoppingListRepository.ts.
 */
export interface ShoppingListRepository {
  addItem(input: NewShoppingListItemInput): Promise<ShoppingListItem>;
  listByStatus(status: ShoppingListStatus): Promise<ShoppingListItem[]>;
  markBought(id: number): Promise<ShoppingListItem>;
}

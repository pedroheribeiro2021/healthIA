# HealthIA — Contratos dos Engines

Fluxo: `health_events → Analytics → Insights → Recommendations → (PWA | AI)`.
Cada engine só conhece a saída do anterior. Nenhum engine chama IA para calcular. Todos em TypeScript puro (sem I/O nos cálculos), testados com vitest.

## 1. Analytics Engine (`web/src/engines/analytics/`)

### Catálogo de métricas (`metric_id`)

Formato: `dominio.metrica.janela`. Declarado em `analytics/catalog.ts` — única fonte de nomes válidos (usada por `goals` e pelo dashboard).

| metric_id (exemplos) | Descrição |
|---|---|
| `sleep.duration.daily` / `.avg7d` / `.avg30d` | duração de sono |
| `sleep.efficiency.daily` | tempo dormindo ÷ tempo na cama |
| `sleep.bedtime.avg7d` | horário médio de dormir |
| `hr.resting.daily` / `.avg7d` | FC de repouso |
| `hrv.rmssd.daily` / `.avg7d` / `.baseline60d` | HRV |
| `training.load.daily` / `.acwr` | carga (TRIMP simplificado); ACWR = aguda 7d / crônica 28d |
| `body.weight.avg7d` / `body.fat_pct.trend` / `body.lean_mass.trend` | composição corporal |
| `nutrition.protein.daily` / `nutrition.kcal.balance7d` | nutrição |
| `recovery.score.daily` | score composto (abaixo) |
| `lab.<marker>.latest` / `.trend` | marcadores laboratoriais |

### Interfaces

```ts
interface MetricCalculator {
  metricId: string;
  requiredEventTypes: readonly string[];
  compute(events: HealthEvent[], period: Period): MetricResult;
}

interface TrendAnalyzer {
  // regressão linear/Theil-Sen sobre snapshots; direção, slope, confiança
  analyze(series: TimeSeries): TrendResult;
}

interface CorrelationFinder {
  // pares de métricas com defasagem 0..3 dias (sono ontem × HRV hoje)
  // Spearman; reporta apenas com n >= 14 pares e p < 0.05
  find(metrics: Record<string, TimeSeries>, maxLagDays?: number): CorrelationResult[];
}

interface ComparisonEngine {
  // períodos (semana × anterior, mês × mês) com % e significância
  compare(metricId: string, a: Period, b: Period): ComparisonResult;
}
```

Estatística: implementação própria em `analytics/stats/` (média móvel, regressão, Spearman, teste de significância) — funções puras testadas; sem dependência pesada.

### Recovery Score v1 (`algoVersion = 'recovery-1'`)

```
recovery = 100 × (0.40·hrvNorm + 0.30·sleepNorm + 0.20·rhrNorm + 0.10·loadNorm)

hrvNorm   = clamp01(hrvHoje / baseline60d)
sleepNorm = clamp01(duraçãoOntem / 8h) × eficiência
rhrNorm   = clamp01(baselineRhr60d / rhrHoje)
loadNorm  = 1 − clamp01((acwr − 0.8) / 0.7)
```

Componentes ausentes ⇒ pesos re-normalizados entre os presentes; `detail` registra o que faltou. v1 assumida imperfeita — por isso `algo_version` existe.

## 2. Insight Engine (`web/src/engines/insights/`)

```ts
interface InsightRule {
  ruleId: string;
  requiredMetrics: readonly string[];
  evaluate(metrics: MetricStore): Insight | null;
}
```

Regras iniciais (`insights/rules/`):

| ruleId | Condição (resumo) |
|---|---|
| `hrv_drop_after_short_sleep` | correlação sono<6h → queda HRV confirmada + ocorreu ontem |
| `consecutive_soccer_recovery` | recovery < 60 após 2 dias seguidos de futebol |
| `weight_trend_vs_goal` | tendência de peso diverge da meta ativa |
| `protein_below_target` | proteína média 7d < meta |
| `sleep_regression` | duração média 7d caiu > 10% vs 30d |
| `acwr_high` | ACWR > 1.5 (risco de overtraining) |
| `lab_out_of_range` | marcador fora da faixa de referência do laudo |

Toda insight carrega `evidence` (números que a justificam) — é o que a IA recebe para explicar.

## 3. Recommendation Engine (`web/src/engines/recommendations/`)

```ts
interface RecommendationPolicy {
  recommend(insights: Insight[], goals: Goal[]): Recommendation[];
}
```

Mapeamento determinístico insight → ação + priorização (severidade, recência, meta afetada). Máx. 3 abertas por dia no dashboard.

## 4. AI Engine (`web/src/engines/ai/`)

```ts
interface AIProvider {
  name: string;
  complete(system: string, messages: Message[]): Promise<string>;
  stream(system: string, messages: Message[]): AsyncIterable<string>;
}

// ContextBuilder: daily_summary recente, snapshots relevantes, insights ativos,
// recomendações abertas, metas. NUNCA eventos brutos em massa.
buildContext(question: string): AIContext;
```

- System prompt fixo: "você explica indicadores já calculados; se pedirem um número fora do contexto, diga que o sistema ainda não calcula essa métrica — não estime".
- Casos de uso: chat, explicação de insight, plano semanal, sugestão de receita dentro dos macros calculados.
- Config: `AI_PROVIDER=gemini|anthropic|openai` + chave (env server-side). Default `gemini` (free tier). Sem chave: chat desabilitado, resto do app intacto.

## 5. API REST (rotas em `web/src/app/api/v1/`)

```
POST /api/v1/sync/batch                  # ingestão (sync-app)
POST /api/v1/events/manual               # dado manual (peso, refeição, nota...)
POST /api/v1/imports/bioimpedance        # upload bioimpedância
POST /api/v1/imports/lab                 # upload exame laboratorial
GET  /api/v1/summary/daily?from&to
GET  /api/v1/metrics/{metricId}?from&to
GET  /api/v1/insights?active=true
GET  /api/v1/recommendations?status=open
POST /api/v1/recommendations/{id}/done
GET  /api/v1/correlations?minConfidence=
CRUD /api/v1/recipes, /api/v1/shopping-list, /api/v1/goals
POST /api/v1/ai/chat                     # streaming (SSE)
GET  /api/v1/cron/daily                  # Vercel Cron (protegida por CRON_SECRET)
POST /api/v1/admin/recompute | /reprocess
```

Rotas são thin controllers: validam (zod), chamam service/engine, retornam. Zero regra de negócio.

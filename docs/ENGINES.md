# HealthAI — Contratos dos Engines

Fluxo: `health_events → Analytics → Insights → Recommendations → (Dashboard | AI)`.
Cada engine só conhece a saída do anterior. Nenhum engine chama IA para calcular.

## 1. Analytics Engine

### Catálogo de métricas (`metric_id`)

Formato: `dominio.metrica.janela`. Catálogo declarado em `engines/analytics/catalog.py` — única fonte de nomes válidos (usada também por `goals` e dashboard).

| metric_id (exemplos) | Descrição |
|---|---|
| `sleep.duration.daily` / `.avg7d` / `.avg30d` | duração de sono |
| `sleep.efficiency.daily` | tempo dormindo ÷ tempo na cama |
| `sleep.bedtime.avg7d` | horário médio de dormir |
| `hr.resting.daily` / `.avg7d` | FC de repouso |
| `hrv.rmssd.daily` / `.avg7d` / `.baseline60d` | HRV |
| `training.load.daily` / `.acwr` | carga de treino (TRIMP simplificado); ACWR = aguda(7d)/crônica(28d) |
| `body.weight.avg7d` / `body.fat_pct.trend` / `body.lean_mass.trend` | composição corporal |
| `nutrition.protein.daily` / `nutrition.kcal.balance7d` | nutrição |
| `recovery.score.daily` | score composto (abaixo) |
| `lab.<marker>.latest` / `.trend` | marcadores laboratoriais |

### Interfaces (Python, em `engines/analytics/`)

```python
class MetricCalculator(Protocol):
    metric_id: str
    required_event_types: tuple[str, ...]
    def compute(self, events: pd.DataFrame, period: Period) -> MetricResult: ...

class TrendAnalyzer(Protocol):
    # regressão linear/Theil-Sen sobre snapshots; retorna direção, slope, confiança
    def analyze(self, series: pd.Series) -> TrendResult: ...

class CorrelationFinder(Protocol):
    # cruza pares de métricas com defasagem 0..3 dias (ex.: sono ontem × HRV hoje)
    # Spearman + exigência de n mínimo (>= 14 pares) e p < 0.05 para reportar
    def find(self, metrics: dict[str, pd.Series], max_lag_days: int = 3) -> list[CorrelationResult]: ...

class ComparisonEngine(Protocol):
    # compara períodos (semana × semana anterior, mês × mês) com % e significância
    def compare(self, metric_id: str, a: Period, b: Period) -> ComparisonResult: ...
```

### Recovery Score v1 (determinístico, `algo_version = 'recovery-1'`)

```
recovery = 100 × (0.40 × hrv_norm + 0.30 × sleep_norm + 0.20 × rhr_norm + 0.10 × load_norm)

hrv_norm   = clamp01( hrv_hoje / baseline_60d )              # >1 trunca em 1
sleep_norm = clamp01( duração_ontem / 8h ) × eficiência
rhr_norm   = clamp01( baseline_rhr_60d / rhr_hoje )
load_norm  = 1 − clamp01( (acwr − 0.8) / 0.7 )               # penaliza ACWR alto
```

Componentes ausentes ⇒ pesos re-normalizados entre os presentes; `detail` registra o que faltou. Score é v1 assumida imperfeita — por isso `algo_version` existe.

## 2. Insight Engine

```python
class InsightRule(Protocol):
    rule_id: str
    required_metrics: tuple[str, ...]
    def evaluate(self, metrics: MetricStore) -> Insight | None: ...
```

Regras iniciais (`engines/insights/rules/`):

| rule_id | Condição (resumo) |
|---|---|
| `hrv_drop_after_short_sleep` | correlação sono<6h → queda HRV confirmada + ocorreu ontem |
| `consecutive_soccer_recovery` | recovery < 60 após 2 dias seguidos de futebol |
| `weight_trend_vs_goal` | tendência de peso diverge da meta ativa |
| `protein_below_target` | proteína média 7d < meta |
| `sleep_regression` | duração média 7d caiu > 10% vs 30d |
| `acwr_high` | ACWR > 1.5 (risco de overtraining) |
| `lab_out_of_range` | marcador fora da faixa de referência do laudo |

Toda insight carrega `evidence` (JSON com números que a justificam) — é isso que a IA recebe para explicar.

## 3. Recommendation Engine

```python
class RecommendationPolicy(Protocol):
    def recommend(self, insights: list[Insight], goals: list[Goal]) -> list[Recommendation]: ...
```

Mapeamento determinístico insight → ação + priorização (severidade, recência, meta afetada). Máximo de 3 recomendações abertas por dia no dashboard.

## 4. AI Engine

```python
class AIProvider(Protocol):
    name: str
    def complete(self, system: str, messages: list[Message]) -> str: ...
    def stream(self, system: str, messages: list[Message]) -> Iterator[str]: ...

class ContextBuilder:
    # monta o contexto da conversa: daily_summary recente, snapshots relevantes,
    # insights ativos, recomendações abertas, metas. NUNCA eventos brutos em massa.
    def build(self, question: str) -> AIContext: ...
```

- System prompt fixo deixa claro: "você explica indicadores já calculados; se perguntarem por um número que não está no contexto, diga que o sistema ainda não calcula essa métrica — não estime".
- Casos de uso: chat, explicação de insight ("por quê?"), geração de plano semanal, sugestão de receita (respeitando macros calculados pelo Analytics).
- Config: `HEALTHAI_AI_PROVIDER=ollama|anthropic|openai|gemini` + chave/URL correspondente. Default `ollama` (`llama3.1` local).

## 5. API REST (superfície mínima por fase)

```
POST /api/v1/sync/batch                  # ingestão (sync-app)
POST /api/v1/events/manual               # dado manual (peso, refeição, nota...)
POST /api/v1/imports/bioimpedance        # upload exame bioimpedância
POST /api/v1/imports/lab                 # upload exame laboratorial
GET  /api/v1/summary/daily?from&to       # daily_summary
GET  /api/v1/metrics/{metric_id}?from&to # séries de snapshots
GET  /api/v1/insights?active=true
GET  /api/v1/recommendations?status=open
POST /api/v1/recommendations/{id}/done
GET  /api/v1/correlations?min_confidence=
CRUD /api/v1/recipes, /api/v1/shopping-list, /api/v1/goals
POST /api/v1/ai/chat                     # streaming (SSE)
```

# HealthAI — Modelo de Dados

## Princípios

1. **Duas camadas**: bruto (`raw_records`, imutável, como veio da origem) e normalizado (`health_events`, modelo interno único). Tudo o mais é derivável.
2. **Append-only** nas duas camadas. Correção = novo evento que supersede o anterior, nunca UPDATE/DELETE.
3. **SI + UTC** em tudo que é armazenado. Timezone (`America/Sao_Paulo`) só na apresentação e no corte de "dia".
4. **Recalculável**: `metric_snapshots`, `insights` e `recommendations` podem ser apagados e regenerados a qualquer momento a partir de `health_events`.

## Camada 1 — Bruto

```sql
CREATE TABLE raw_records (
    id              INTEGER PRIMARY KEY,
    source          TEXT NOT NULL,             -- 'health_connect' | 'manual' | 'bioimpedance' | 'lab' | 'recipe_import'
    record_type     TEXT NOT NULL,             -- tipo na origem, ex.: 'SleepSession', 'ExerciseSession'
    external_id     TEXT,                      -- id do registro na origem (quando existir)
    payload         TEXT NOT NULL,             -- JSON bruto, exatamente como recebido
    payload_hash    TEXT NOT NULL,             -- sha256 do payload canônico (dedup)
    device_id       TEXT,
    received_at     TEXT NOT NULL,             -- UTC ISO 8601
    norm_status     TEXT NOT NULL DEFAULT 'pending',  -- 'pending' | 'done' | 'error'
    norm_error      TEXT,
    UNIQUE (source, external_id),
    UNIQUE (payload_hash)
);
```

Dedup na ingestão: conflito em qualquer das duas UNIQUEs ⇒ registro contado como `duplicate`, ignorado silenciosamente.

## Camada 2 — Eventos normalizados (fonte da verdade)

Modelo de evento único para tudo. Campos comuns fortes + detalhe tipado em JSON validado por Pydantic.

```sql
CREATE TABLE health_events (
    id              INTEGER PRIMARY KEY,
    event_type      TEXT NOT NULL,     -- ver taxonomia abaixo
    start_time      TEXT NOT NULL,     -- UTC ISO 8601
    end_time        TEXT,              -- NULL para medições pontuais
    value           REAL,              -- valor principal em unidade SI (quando escalar)
    unit            TEXT,              -- 'kg' | 'ms' | 'bpm' | 's' | 'kcal' | 'g' | 'l' | ...
    detail          TEXT,              -- JSON tipado por event_type (schema Pydantic em domain/)
    source          TEXT NOT NULL,
    raw_record_id   INTEGER REFERENCES raw_records(id),
    superseded_by   INTEGER REFERENCES health_events(id),  -- correção/versão nova; NULL = vigente
    created_at      TEXT NOT NULL
);
CREATE INDEX idx_events_type_time ON health_events (event_type, start_time);
```

### Taxonomia de `event_type`

| event_type | value/unit | detail (resumo) |
|---|---|---|
| `sleep_session` | duração total, s | estágios (deep/rem/light/awake em s), horário de dormir/acordar |
| `workout` | duração, s | `sport` ('soccer'\|'gym'\|'run'\|...), distância m, kcal, FC média/máx, zonas |
| `heart_rate` | bpm | contexto ('rest'\|'exercise'\|'continuous') |
| `resting_heart_rate` | bpm | — |
| `hrv` | rmssd, ms | método de medição |
| `steps` | contagem/dia | — |
| `weight` | kg | — |
| `body_composition` | peso, kg | origem ('watch'\|'clinical_bia'), massa magra/gorda kg, % gordura, água, massa óssea, taxa metabólica |
| `hydration` | l | — |
| `meal` | kcal | tipo de refeição, itens, macros (proteína/carbo/gordura g), micros, `recipe_id` opcional |
| `lab_result` | valor do marcador | `marker` ('glucose'\|'vitamin_d'\|'testosterone'\|'ferritin'\|'crp'\|'hdl'\|...), unidade original, faixa de referência do laudo |
| `note` | — | anotação livre (contexto qualitativo: lesão, viagem, estresse) |

Regra de leitura: consultas sempre filtram `superseded_by IS NULL`.

## Tabelas de domínio (não-eventos)

```sql
CREATE TABLE recipes (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    servings REAL NOT NULL DEFAULT 1,
    instructions TEXT,
    source TEXT NOT NULL DEFAULT 'manual',   -- 'manual' | 'ai_suggested'
    created_at TEXT NOT NULL,
    archived INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE recipe_ingredients (
    id INTEGER PRIMARY KEY,
    recipe_id INTEGER NOT NULL REFERENCES recipes(id),
    food_name TEXT NOT NULL,
    quantity REAL NOT NULL,
    unit TEXT NOT NULL,
    -- macros por quantidade informada (preenchidos na criação, via tabela local de alimentos TACO/TBCA)
    kcal REAL, protein_g REAL, carbs_g REAL, fat_g REAL, micros TEXT  -- micros = JSON
);

CREATE TABLE foods (               -- base nutricional local (importar TACO/TBCA na Fase 5)
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    per_100g TEXT NOT NULL          -- JSON: kcal, macros, micros
);

CREATE TABLE shopping_list_items (
    id INTEGER PRIMARY KEY,
    food_name TEXT NOT NULL,
    quantity REAL, unit TEXT,
    status TEXT NOT NULL DEFAULT 'open',   -- 'open' | 'bought'
    origin_recipe_id INTEGER REFERENCES recipes(id),
    created_at TEXT NOT NULL
);

CREATE TABLE goals (
    id INTEGER PRIMARY KEY,
    metric_id TEXT NOT NULL,        -- referencia o catálogo de métricas do Analytics (ENGINES.md)
    target_value REAL NOT NULL,
    direction TEXT NOT NULL,        -- 'increase' | 'decrease' | 'maintain'
    deadline TEXT,
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL
);
```

## Camada derivada (recalculável)

```sql
CREATE TABLE metric_snapshots (
    id INTEGER PRIMARY KEY,
    metric_id TEXT NOT NULL,        -- ex.: 'sleep.duration.avg7d', 'recovery.score.daily', 'hrv.rmssd.avg7d'
    period_start TEXT NOT NULL,     -- UTC
    period_end TEXT NOT NULL,
    value REAL,
    detail TEXT,                    -- JSON: componentes do score, n de amostras, IC, etc.
    computed_at TEXT NOT NULL,
    algo_version TEXT NOT NULL,     -- versão do algoritmo que gerou (permite comparar após evolução)
    UNIQUE (metric_id, period_start, period_end, algo_version)
);

CREATE TABLE insights (
    id INTEGER PRIMARY KEY,
    rule_id TEXT NOT NULL,          -- ex.: 'hrv_drop_after_short_sleep'
    severity TEXT NOT NULL,         -- 'info' | 'attention' | 'alert'
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    evidence TEXT,                  -- JSON: métricas e valores que dispararam a regra
    period_start TEXT, period_end TEXT,
    created_at TEXT NOT NULL,
    dismissed INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE recommendations (
    id INTEGER PRIMARY KEY,
    insight_id INTEGER REFERENCES insights(id),
    action_type TEXT NOT NULL,      -- 'sleep_earlier' | 'increase_protein' | 'reduce_training_load' | 'recipe' | ...
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    priority INTEGER NOT NULL,      -- 1 = mais importante
    created_at TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open'   -- 'open' | 'done' | 'dismissed'
);

CREATE TABLE daily_summary (        -- materialização por dia local (America/Sao_Paulo)
    day TEXT PRIMARY KEY,           -- 'YYYY-MM-DD'
    sleep_duration_s REAL, sleep_score REAL,
    resting_hr REAL, hrv_rmssd REAL,
    steps INTEGER, workouts INTEGER, training_load REAL,
    kcal_in REAL, protein_g REAL, water_l REAL,
    weight_kg REAL,
    recovery_score REAL,
    computed_at TEXT NOT NULL
);
```

## Regras de integridade

- `health_events` e `raw_records`: sem UPDATE (exceto `norm_status`/`superseded_by`) e sem DELETE — enforçado por convenção nos repositórios e por triggers de proteção nas migrations.
- Toda linha de `health_events` referencia seu `raw_record_id` (rastreabilidade origem → evento).
- Camada derivada pode ser truncada e regenerada: `uv run python -m app.engines.analytics.recompute --all`.

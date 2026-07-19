# HealthIA — Modelo de Dados (Supabase/Postgres)

## Princípios

1. **Duas camadas**: bruto (`raw_records`, imutável) e normalizado (`health_events`, modelo interno único). Tudo o mais é derivável.
2. **Append-only** nas duas camadas. Correção = novo evento que supersede o anterior (`superseded_by`), nunca UPDATE/DELETE.
3. **SI + UTC** (`timestamptz`). Timezone `America/Sao_Paulo` só na apresentação e no corte de "dia".
4. **Recalculável**: `metric_snapshots`, `insights`, `recommendations` e `daily_summary` podem ser truncados e regenerados a partir de `health_events`.
5. **RLS em todas as tabelas**: acesso apenas ao usuário autenticado; `anon` sem acesso.

## Camada 1 — Bruto

```sql
create table raw_records (
    id            bigint generated always as identity primary key,
    source        text not null,          -- 'health_connect' | 'manual' | 'bioimpedance' | 'lab' | 'recipe_import'
    record_type   text not null,          -- tipo na origem, ex.: 'SleepSession'
    external_id   text,                   -- id do registro na origem
    payload       jsonb not null,         -- bruto, exatamente como recebido
    payload_hash  text not null,          -- sha256 do payload canônico
    device_id     text,
    received_at   timestamptz not null default now(),
    norm_status   text not null default 'pending',  -- 'pending' | 'done' | 'error'
    norm_error    text,
    unique nulls not distinct (source, external_id),
    unique (payload_hash)
);
```

Dedup na ingestão: conflito em qualquer unique ⇒ contado como `duplicate`, ignorado (upsert `on conflict do nothing`).

## Camada 2 — Eventos normalizados (fonte da verdade)

```sql
create table health_events (
    id             bigint generated always as identity primary key,
    event_type     text not null,          -- taxonomia abaixo
    start_time     timestamptz not null,
    end_time       timestamptz,            -- null p/ medições pontuais
    value          double precision,       -- valor principal em SI (quando escalar)
    unit           text,                   -- 'kg' | 'ms' | 'bpm' | 's' | 'kcal' | 'g' | 'l' | ...
    detail         jsonb,                  -- tipado por event_type (schema zod em domain/)
    source         text not null,
    raw_record_id  bigint references raw_records(id),
    superseded_by  bigint references health_events(id),  -- null = vigente
    created_at     timestamptz not null default now()
);
create index idx_events_type_time on health_events (event_type, start_time);
```

### Taxonomia de `event_type`

| event_type | value/unit | detail (resumo) |
|---|---|---|
| `sleep_session` | duração total, s | estágios (deep/rem/light/awake em s), dormir/acordar |
| `workout` | duração, s | `sport` ('soccer'\|'gym'\|'run'\|...), distância m, kcal, FC média/máx, zonas |
| `heart_rate` | bpm | contexto ('rest'\|'exercise'\|'continuous') |
| `resting_heart_rate` | bpm | — |
| `hrv` | rmssd, ms | método |
| `steps` | contagem/dia | — |
| `weight` | kg | — |
| `body_composition` | peso, kg | origem ('watch'\|'clinical_bia'), massa magra/gorda, % gordura, água, TMB |
| `hydration` | l | — |
| `meal` | kcal | tipo, itens, macros (g), micros, `recipe_id` opcional |
| `lab_result` | valor | `marker` ('glucose'\|'vitamin_d'\|'testosterone'\|'ferritin'\|'crp'\|...), unidade original, faixa de referência |
| `note` | — | anotação livre (lesão, viagem, estresse) |

Leitura sempre com `superseded_by is null`.

## Tabelas de domínio

```sql
create table recipes (
    id bigint generated always as identity primary key,
    name text not null,
    servings numeric not null default 1,
    instructions text,
    source text not null default 'manual',     -- 'manual' | 'ai_suggested'
    archived boolean not null default false,
    created_at timestamptz not null default now()
);

create table recipe_ingredients (
    id bigint generated always as identity primary key,
    recipe_id bigint not null references recipes(id),
    food_name text not null,
    quantity numeric not null,
    unit text not null,
    kcal numeric, protein_g numeric, carbs_g numeric, fat_g numeric,
    micros jsonb
);

create table foods (                           -- base nutricional (TACO/TBCA, Fase 5)
    id bigint generated always as identity primary key,
    name text not null,
    per_100g jsonb not null                    -- kcal, macros, micros
);

create table shopping_list_items (
    id bigint generated always as identity primary key,
    food_name text not null,
    quantity numeric, unit text,
    status text not null default 'open',       -- 'open' | 'bought'
    origin_recipe_id bigint references recipes(id),
    created_at timestamptz not null default now()
);

create table goals (
    id bigint generated always as identity primary key,
    metric_id text not null,                   -- catálogo do Analytics (ENGINES.md)
    target_value double precision not null,
    direction text not null,                   -- 'increase' | 'decrease' | 'maintain'
    deadline date,
    active boolean not null default true,
    created_at timestamptz not null default now()
);
```

## Camada derivada (recalculável)

```sql
create table metric_snapshots (
    id bigint generated always as identity primary key,
    metric_id text not null,                   -- ex.: 'sleep.duration.avg7d', 'recovery.score.daily'
    period_start timestamptz not null,
    period_end   timestamptz not null,
    value double precision,
    detail jsonb,                              -- componentes, n de amostras, IC...
    algo_version text not null,                -- permite comparar após evolução do algoritmo
    computed_at timestamptz not null default now(),
    unique (metric_id, period_start, period_end, algo_version)
);

create table insights (
    id bigint generated always as identity primary key,
    rule_id text not null,
    severity text not null,                    -- 'info' | 'attention' | 'alert'
    title text not null,
    body text not null,
    evidence jsonb,                            -- números que dispararam a regra
    period_start timestamptz, period_end timestamptz,
    dismissed boolean not null default false,
    created_at timestamptz not null default now()
);

create table recommendations (
    id bigint generated always as identity primary key,
    insight_id bigint references insights(id),
    action_type text not null,                 -- 'sleep_earlier' | 'increase_protein' | 'reduce_training_load' | 'recipe' | ...
    title text not null,
    body text not null,
    priority int not null,                     -- 1 = mais importante
    status text not null default 'open',       -- 'open' | 'done' | 'dismissed'
    created_at timestamptz not null default now()
);

create table daily_summary (
    day date primary key,                      -- dia local America/Sao_Paulo
    sleep_duration_s double precision, sleep_score double precision,
    resting_hr double precision, hrv_rmssd double precision,
    steps int, workouts int, training_load double precision,
    kcal_in double precision, protein_g double precision, water_l double precision,
    weight_kg double precision,
    recovery_score double precision,
    computed_at timestamptz not null default now()
);
```

## Integridade e RLS

- `raw_records`/`health_events`: UPDATE permitido só em `norm_status`/`superseded_by`; DELETE proibido — enforçado por policies RLS restritivas + triggers de proteção.
- Toda linha de `health_events` referencia `raw_record_id` (rastreabilidade).
- Uploads de exames (PDF/imagem) no Supabase Storage, bucket privado `exams`, referenciados por `raw_records.payload`.
- Regeneração da camada derivada: rota admin `POST /api/v1/admin/recompute` (protegida, server-side).

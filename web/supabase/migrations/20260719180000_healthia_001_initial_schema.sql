-- HealthIA v2 — schema dedicado, isolado de outros apps no mesmo projeto Supabase.
create schema if not exists healthia;

-- ============================================================
-- Camada 1 — Bruto
-- ============================================================
create table healthia.raw_records (
    id            bigint generated always as identity primary key,
    source        text not null,
    record_type   text not null,
    external_id   text,
    payload       jsonb not null,
    payload_hash  text not null,
    device_id     text,
    received_at   timestamptz not null default now(),
    norm_status   text not null default 'pending',
    norm_error    text,
    unique nulls not distinct (source, external_id),
    unique (payload_hash)
);

-- ============================================================
-- Camada 2 — Eventos normalizados (fonte da verdade)
-- ============================================================
create table healthia.health_events (
    id             bigint generated always as identity primary key,
    event_type     text not null,
    start_time     timestamptz not null,
    end_time       timestamptz,
    value          double precision,
    unit           text,
    detail         jsonb,
    source         text not null,
    raw_record_id  bigint references healthia.raw_records(id),
    superseded_by  bigint references healthia.health_events(id),
    created_at     timestamptz not null default now()
);
create index idx_healthia_events_type_time on healthia.health_events (event_type, start_time);

-- ============================================================
-- Tabelas de domínio
-- ============================================================
create table healthia.recipes (
    id bigint generated always as identity primary key,
    name text not null,
    servings numeric not null default 1,
    instructions text,
    source text not null default 'manual',
    archived boolean not null default false,
    created_at timestamptz not null default now()
);

create table healthia.recipe_ingredients (
    id bigint generated always as identity primary key,
    recipe_id bigint not null references healthia.recipes(id),
    food_name text not null,
    quantity numeric not null,
    unit text not null,
    kcal numeric, protein_g numeric, carbs_g numeric, fat_g numeric,
    micros jsonb
);

create table healthia.foods (
    id bigint generated always as identity primary key,
    name text not null,
    per_100g jsonb not null
);

create table healthia.shopping_list_items (
    id bigint generated always as identity primary key,
    food_name text not null,
    quantity numeric, unit text,
    status text not null default 'open',
    origin_recipe_id bigint references healthia.recipes(id),
    created_at timestamptz not null default now()
);

create table healthia.goals (
    id bigint generated always as identity primary key,
    metric_id text not null,
    target_value double precision not null,
    direction text not null,
    deadline date,
    active boolean not null default true,
    created_at timestamptz not null default now()
);

-- ============================================================
-- Camada derivada (recalculável)
-- ============================================================
create table healthia.metric_snapshots (
    id bigint generated always as identity primary key,
    metric_id text not null,
    period_start timestamptz not null,
    period_end   timestamptz not null,
    value double precision,
    detail jsonb,
    algo_version text not null,
    computed_at timestamptz not null default now(),
    unique (metric_id, period_start, period_end, algo_version)
);

create table healthia.insights (
    id bigint generated always as identity primary key,
    rule_id text not null,
    severity text not null,
    title text not null,
    body text not null,
    evidence jsonb,
    period_start timestamptz, period_end timestamptz,
    dismissed boolean not null default false,
    created_at timestamptz not null default now()
);

create table healthia.recommendations (
    id bigint generated always as identity primary key,
    insight_id bigint references healthia.insights(id),
    action_type text not null,
    title text not null,
    body text not null,
    priority int not null,
    status text not null default 'open',
    created_at timestamptz not null default now()
);

create table healthia.daily_summary (
    day date primary key,
    sleep_duration_s double precision, sleep_score double precision,
    resting_hr double precision, hrv_rmssd double precision,
    steps int, workouts int, training_load double precision,
    kcal_in double precision, protein_g double precision, water_l double precision,
    weight_kg double precision,
    recovery_score double precision,
    computed_at timestamptz not null default now()
);

-- ============================================================
-- RLS — usuário único (Pedro). Sem multi-tenancy: qualquer usuário
-- autenticado no projeto é o Pedro (cadastro fica desabilitado na app).
-- anon não acessa nada. Sem policy de DELETE em nenhuma tabela.
-- ============================================================
do $$
declare t text;
begin
  for t in
    select tablename from pg_tables where schemaname = 'healthia'
  loop
    execute format('alter table healthia.%I enable row level security', t);
    execute format(
      'create policy %I on healthia.%I for select using (auth.role() = ''authenticated'')',
      t || '_select_authenticated', t
    );
    execute format(
      'create policy %I on healthia.%I for insert with check (auth.role() = ''authenticated'')',
      t || '_insert_authenticated', t
    );
    execute format(
      'create policy %I on healthia.%I for update using (auth.role() = ''authenticated'') with check (auth.role() = ''authenticated'')',
      t || '_update_authenticated', t
    );
  end loop;
end $$;

-- ============================================================
-- Triggers de proteção append-only (raw_records, health_events)
-- Rede de segurança mesmo contra service_role, que ignora RLS.
-- ============================================================
create or replace function healthia.protect_raw_records()
returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'raw_records é append-only: DELETE não permitido';
  end if;
  if tg_op = 'UPDATE' then
    if new.source is distinct from old.source
       or new.record_type is distinct from old.record_type
       or new.external_id is distinct from old.external_id
       or new.payload is distinct from old.payload
       or new.payload_hash is distinct from old.payload_hash
       or new.device_id is distinct from old.device_id
       or new.received_at is distinct from old.received_at
    then
      raise exception 'raw_records é append-only: apenas norm_status/norm_error podem mudar';
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_protect_raw_records
before update or delete on healthia.raw_records
for each row execute function healthia.protect_raw_records();

create or replace function healthia.protect_health_events()
returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'health_events é append-only: DELETE não permitido';
  end if;
  if tg_op = 'UPDATE' then
    if new.event_type is distinct from old.event_type
       or new.start_time is distinct from old.start_time
       or new.end_time is distinct from old.end_time
       or new.value is distinct from old.value
       or new.unit is distinct from old.unit
       or new.detail is distinct from old.detail
       or new.source is distinct from old.source
       or new.raw_record_id is distinct from old.raw_record_id
       or new.created_at is distinct from old.created_at
    then
      raise exception 'health_events é append-only: apenas superseded_by pode mudar';
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_protect_health_events
before update or delete on healthia.health_events
for each row execute function healthia.protect_health_events();

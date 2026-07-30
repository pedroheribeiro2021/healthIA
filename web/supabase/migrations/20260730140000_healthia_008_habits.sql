-- Fase 7, Etapa 1.1 (docs/FASE-7-ROTINA.md) — hábitos como entidade de 1ª
-- classe, não checkbox de UI nem `note` em health_events: precisa de
-- streak, métrica de adesão, regra de insight e correlação.
create table healthia.habits (
    id              bigint generated always as identity primary key,
    slug            text not null unique,          -- 'creatina', 'escadas', 'agua', ...
    name            text not null,
    category        text not null,                 -- 'treino' | 'nutricao' | 'hidratacao' | 'suplementacao' | 'sono'
    kind            text not null,                 -- 'boolean' | 'quantity'
    unit            text,                          -- 'l', 'subidas' — null quando boolean
    target_per_day  numeric,                       -- meta diária (kind='quantity')
    target_per_week numeric not null,               -- quantos dias por semana o hábito conta como cumprido
    source_kind     text not null default 'manual_log',  -- 'manual_log' | 'derived'
    priority        text not null default 'core',  -- 'core' | 'bonus'
    sort_order      int not null default 0,
    active          boolean not null default true,
    created_at      timestamptz not null default now()
);

-- Mutável por dia (upsert + delete) — única exceção ao append-only do
-- schema (ADR-005): adesão é intenção corrigível pelo próprio usuário, não
-- medição. Marcar por engano e desmarcar não é "corrigir a história".
create table healthia.habit_logs (
    id         bigint generated always as identity primary key,
    habit_id   bigint not null references healthia.habits(id),
    day        date not null,                      -- dia local America/Sao_Paulo
    done       boolean not null default true,
    quantity   numeric,                            -- preenchido quando kind='quantity'
    note       text,
    logged_at  timestamptz not null default now(),
    unique (habit_id, day)
);

create index idx_habit_logs_day on healthia.habit_logs (day);

-- RLS igual ao resto de healthia.* (healthia.is_authorized(), definida na
-- migration 004) — o loop das migrations 002/003 só cobre tabelas que já
-- existiam na época, então tabelas novas precisam da própria policy.
alter table healthia.habits enable row level security;
alter table healthia.habit_logs enable row level security;

create policy "habits_select_authorized" on healthia.habits
  for select to authenticated using (healthia.is_authorized());
create policy "habits_insert_authorized" on healthia.habits
  for insert to authenticated with check (healthia.is_authorized());
create policy "habits_update_authorized" on healthia.habits
  for update to authenticated using (healthia.is_authorized()) with check (healthia.is_authorized());

create policy "habit_logs_select_authorized" on healthia.habit_logs
  for select to authenticated using (healthia.is_authorized());
create policy "habit_logs_insert_authorized" on healthia.habit_logs
  for insert to authenticated with check (healthia.is_authorized());
create policy "habit_logs_update_authorized" on healthia.habit_logs
  for update to authenticated using (healthia.is_authorized()) with check (healthia.is_authorized());
-- Único DELETE concedido no schema inteiro: consequência direta de
-- habit_logs não ser append-only (ver comentário acima e ADR-005).
create policy "habit_logs_delete_authorized" on healthia.habit_logs
  for delete to authenticated using (healthia.is_authorized());

-- A migration 005 concedeu select/insert/update "on all tables in schema"
-- no momento em que rodou — não cobre tabelas criadas depois, então
-- precisa repetir aqui pras duas novas.
grant select, insert, update on healthia.habits to authenticated;
grant select, insert, update, delete on healthia.habit_logs to authenticated;

-- Aditivas em daily_summary (docs/FASE-7-ROTINA.md, 1.3): adesão aos
-- hábitos do dia, e o % de gordura corporal (calculator body.fatpct.daily
-- já existe desde a Fase 5 — só passa a persistir aqui, pra a meta de
-- gordura ler "valor atual" sem consultar metric_snapshots).
alter table healthia.daily_summary
  add column habit_adherence_pct double precision,
  add column body_fat_pct double precision;

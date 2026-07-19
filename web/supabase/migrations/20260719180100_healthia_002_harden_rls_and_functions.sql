-- Corrige avisos do security advisor na migration anterior:
-- 1) policies sem "to authenticated" explícito (linter: auth_allow_anonymous_sign_ins)
-- 2) funções trigger sem search_path fixo (linter: function_search_path_mutable)

do $$
declare t text;
begin
  for t in
    select tablename from pg_tables where schemaname = 'healthia'
  loop
    execute format('drop policy if exists %I on healthia.%I', t || '_select_authenticated', t);
    execute format('drop policy if exists %I on healthia.%I', t || '_insert_authenticated', t);
    execute format('drop policy if exists %I on healthia.%I', t || '_update_authenticated', t);

    execute format(
      'create policy %I on healthia.%I for select to authenticated using (true)',
      t || '_select_authenticated', t
    );
    execute format(
      'create policy %I on healthia.%I for insert to authenticated with check (true)',
      t || '_insert_authenticated', t
    );
    execute format(
      'create policy %I on healthia.%I for update to authenticated using (true) with check (true)',
      t || '_update_authenticated', t
    );
  end loop;
end $$;

alter function healthia.protect_raw_records() set search_path = healthia, pg_temp;
alter function healthia.protect_health_events() set search_path = healthia, pg_temp;

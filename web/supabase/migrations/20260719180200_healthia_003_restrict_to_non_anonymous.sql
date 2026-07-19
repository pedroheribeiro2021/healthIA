-- O projeto é compartilhado com outros apps (rachaconta, fi_*) que usam
-- auth.signInAnonymously() extensivamente (~95 usuários anônimos hoje).
-- No Supabase, sessão anônima também carrega role = 'authenticated', então
-- "to authenticated" sozinho vazaria os dados do healthia para qualquer
-- usuário anônimo de outro app neste projeto. Esta função fecha essa brecha.
--
-- Nota: ainda não restringe a um auth.uid() específico do Pedro porque a
-- conta dele ainda não existe neste projeto (ver notas/Pendencias.md).
-- Assim que existir, uma migration seguinte deve trocar o corpo desta
-- função para comparar auth.uid() com o UUID fixo do Pedro.
create or replace function healthia.is_authorized()
returns boolean
language sql
stable
set search_path = pg_catalog
as $$
  select auth.role() = 'authenticated'
     and coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false;
$$;

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
      'create policy %I on healthia.%I for select to authenticated using (healthia.is_authorized())',
      t || '_select_authorized', t
    );
    execute format(
      'create policy %I on healthia.%I for insert to authenticated with check (healthia.is_authorized())',
      t || '_insert_authorized', t
    );
    execute format(
      'create policy %I on healthia.%I for update to authenticated using (healthia.is_authorized()) with check (healthia.is_authorized())',
      t || '_update_authorized', t
    );
  end loop;
end $$;

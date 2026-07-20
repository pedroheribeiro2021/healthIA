-- Agora que a conta real do Pedro existe (pedro@mail.com), fecha a brecha
-- documentada na migration anterior: qualquer conta autenticada não-anônima
-- deste projeto compartilhado ainda passaria por healthia.is_authorized().
-- Trava no UUID fixo do Pedro.
create or replace function healthia.is_authorized()
returns boolean
language sql
stable
set search_path = pg_catalog
as $$
  select auth.uid() = '3fe469a5-84c9-41ee-b207-83e48da8a80b'::uuid;
$$;

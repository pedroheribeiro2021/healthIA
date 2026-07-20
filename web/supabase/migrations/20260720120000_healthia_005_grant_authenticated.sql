-- RLS policies não bastam sem os grants de schema/tabela subjacentes: o
-- Postgres exige USAGE no schema e privilégios na tabela antes de sequer
-- avaliar as policies. Nenhuma migration anterior concedeu isso ao role
-- `authenticated` — só `postgres` (dono das tabelas) tinha acesso, o que
-- fazia toda chamada autenticada da API falhar com
-- "permission denied for schema healthia" mesmo após o schema ser exposto
-- na Data API.
--
-- Sem DELETE: `raw_records` e `health_events` são append-only (triggers já
-- bloqueiam), e não há caso de uso hoje para apagar linha de outra tabela
-- pelo cliente autenticado.
grant usage on schema healthia to authenticated;

grant select, insert, update on all tables in schema healthia to authenticated;

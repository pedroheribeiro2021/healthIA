# Pendências — HealthIA

## Ação do Pedro

- [ ] **Trocar a senha de `pedro@mail.com`** (criada via SQL com senha temporária `123456` só para destravar o desenvolvimento) por uma senha real, agora que o login ponta a ponta em produção já foi validado.

## Resolvido em 2026-07-20 — Fase 0 fechada: login ponta a ponta em produção

- [x] **Supabase: schema `healthia` exposto na Data API** pelo Pedro (Project Settings → API → Exposed schemas).
- [x] **Bug real encontrado e corrigido: faltavam os `GRANT` de schema/tabela para o role `authenticated`.** RLS por si só não basta — o Postgres exige `USAGE` no schema e privilégio na tabela antes mesmo de avaliar as policies. Nenhuma das migrations 001–004 tinha concedido isso (só `postgres`, dono das tabelas, tinha acesso); toda chamada autenticada da API falharia com `permission denied for schema healthia` mesmo com o schema exposto e a RLS correta. Corrigido na migration `20260720120000_healthia_005_grant_authenticated.sql` (`grant usage on schema healthia to authenticated` + `grant select, insert, update on all tables...`, sem `delete` — consistente com o princípio de fonte da verdade imutável).
- [x] **Login validado de ponta a ponta em produção**: testado via `curl` (token emitido para o UUID certo, leitura autenticada em `healthia.health_events` retornando `200`) e via browser real em `https://healthia-six.vercel.app` — login com `pedro@mail.com`/`123456` redireciona para `/` e mostra "Sessão ativa: pedro@mail.com".
- [x] Fase 0 (v2) considerada **pronta**: Supabase + Next.js + Vercel + auth funcionando em produção.

## Resolvido em 2026-07-19 (2) — usuário real do Pedro + RLS travada no UUID dele

- [x] **Supabase: conta do Pedro criada** — `pedro@mail.com`, senha temporária `123456`, UUID `3fe469a5-84c9-41ee-b207-83e48da8a80b`. Sem tool MCP dedicado para `auth.admin.createUser` (e sem `SUPABASE_SERVICE_ROLE_KEY` disponível localmente para chamar a Admin API), criado via `execute_sql` inserindo diretamente em `auth.users` + `auth.identities` (padrão documentado do Supabase para seed de usuário com senha: `crypt()`/`gen_salt('bf')` do pgcrypto, `instance_id` copiado de um usuário existente do projeto). Ação aditiva (INSERT), sem risco às ~97 contas de outros apps no projeto compartilhado.
- [x] **RLS restrita ao UUID do Pedro** — migration `20260719190000_healthia_004_restrict_to_pedro_uuid.sql` aplicada (`healthia.is_authorized()` agora compara `auth.uid()` com o UUID fixo acima, em vez de só checar "autenticado e não anônimo"). `get_advisors` (security) segue mostrando WARN "Anonymous Access Policies" em todas as tabelas `healthia.*` — é falso positivo esperado: o linter do Supabase não enxerga o corpo da function `is_authorized()`, só vê que a policy é `to authenticated`; já estava documentado assim na migration 003.

## Resolvido em 2026-07-19 (sessão com Pedro logado no Vercel via browser)

- [x] Vercel: permissão de deploy — resolvido logando com a conta do Pedro no Chrome (a integração MCP/API seguia bloqueada com `403`, causa não identificada, mas deixou de ser necessária).
- [x] Vercel: repositório `pedroheribeiro2021/healthIA` conectado ao projeto `healthia` (Project Settings → Git) — `git push` na branch de produção já dispara deploy automático.
- [x] Vercel: env vars configuradas (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY` — a última colada pelo próprio Pedro, nunca vista por mim). **Bug real encontrado**: ao criar múltiplas variáveis no mesmo formulário e alternar o toggle "Sensitive", a Vercel salvou o texto de *placeholder* do campo (ex.: `https://aBcDe.supabase.co`) como se fosse o valor real, em vez do que foi digitado — sem erro nem aviso. Só foi descoberto porque o deploy quebrou em runtime (`Error: Your project's URL and Key are required to create a Supabase client!`). Corrigido apagando e recriando as variáveis uma de cada vez, sem mexer no toggle depois de digitar. Vale desconfiar desse toggle no futuro; registrado em `Global/Infra-Cloud-Compartilhada.md` no vault.
- [x] App em produção, funcionando: `https://healthia-six.vercel.app` — redirect `/` → `/login` confirmado, sem erro 500.

## Decisão registrada (ver notas/ADR)

- Schema Supabase dedicado `healthia` dentro do projeto `rachaconta` (não um projeto Supabase novo — org já estava no limite de 2 projetos free). Detalhe em `notas/ADR/ADR-002-schema-compartilhado-supabase.md`.

## Depois (Fase 1)

- [ ] Fase 1 — ingestão manual + pipeline raw→events + PWA instalável

## Decisões pendentes

- [ ] Modelo Gemini do free tier a usar no chat (validar na Fase 6)
- [ ] Estratégia de backup: GitHub Action semanal com pg_dump (definir repo privado/artefato na Fase 0 ou 1)

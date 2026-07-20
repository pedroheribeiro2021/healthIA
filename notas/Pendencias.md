# Pendências — HealthIA

## Ação do Pedro

- [ ] **Trocar a senha de `pedro@mail.com`** (criada via SQL com senha temporária `123456` só para destravar o desenvolvimento) por uma senha real, agora que o login ponta a ponta em produção já foi validado.
- [ ] **Testar a Fase 1 no celular, em produção** — só depois de decidir sobre o merge de `fase-1-ingestao` em `main` (ver abaixo). Abrir o PWA, registrar um peso real pela rua e conferir se o gráfico atualiza. Deliberadamente não simulado a partir do dev server, porque `raw_records`/`health_events` são append-only (sem DELETE) e um registro de teste ficaria permanente na base de produção.
- [ ] **Decidir sobre o merge de `fase-1-ingestao` em `main`.** Está pronta, testada e com deploy validado (preview), mas ainda não mergeada — produção (`main`) segue só com o fechamento da Fase 0.
- [ ] **Reautorizar o escopo da integração MCP da Vercel** (claude.ai → Configurações → Conectores → Vercel) para incluir o projeto `healthia` — hoje `list_projects`/`list_teams` da integração não o enxergam (só o dashboard via sessão de browser funciona), provavelmente porque o projeto não estava no escopo concedido quando a integração foi conectada.

## Resolvido em 2026-07-20 (3) — Bug real: Root Directory da Vercel nunca foi salvo

- [x] **Causa raiz do erro "Couldn't find any `pages` or `app` directory" (e depois "No Next.js version detected") na Vercel**: o campo **Root Directory** do projeto (Settings → Build and Deployment) estava **vazio** — nunca tinha sido salvo como `web`, apesar do app estar dentro de `web/` desde a Fase 0. Builds anteriores só "funcionavam" porque a Vercel tem um heurístico de auto-detecção de framework que às vezes encontrava o Next.js em `web/` mesmo com Root Directory vazio, mascarando o problema; um redeploy sem cache (ou com o cache de dependências indo por um caminho diferente) expunha a inconsistência de formas diferentes a cada tentativa (ora "swc missing" + "couldn't find app directory", ora "No Next.js version detected").
- [x] Diagnóstico incluiu uma pista falsa: um bug de pipe do `grep | wc -l` neste ambiente Bash (Windows/Git Bash) fez parecer que o `package-lock.json` tinha perdido as entradas `@next/swc-*` depois de `npm install recharts` — na real, o lockfile sempre esteve correto (confirmado via Python e via `rm -rf node_modules && npm ci && npm run build` limpo, sem nenhum warning). Lição registrada: não confiar em `grep -o ... | wc -l`/`sort -u` neste ambiente sem checar com uma ferramenta alternativa (Python, ou `grep -c` direto).
- [x] Corrigido preenchendo `web` no campo Root Directory e clicando Save (confirmado "Root directory updated" + persistência após reload). Redeploy de `fase-1-ingestao` (preview) e de `main` (produção) confirmados **Ready** depois da correção — build real de ~40-60s, sem nenhum warning de lockfile.
- [x] Adicionado `.github/workflows/ci.yml`: roda `npm ci` (não `npm install`) + lint/typecheck/test/build em todo push para `main` e toda pull request — teria pego esse tipo de inconsistência de build antes do deploy.

## Resolvido em 2026-07-20 (2) — Fase 1: ingestão manual + pipeline raw→events + PWA

- [x] `POST /api/v1/events/manual` (peso, hidratação, refeição simples, nota) — rota thin, validação zod, dedup por conteúdo (`external_id = payload_hash`, já que `unique nulls not distinct (source, external_id)` faria um segundo lançamento manual com `external_id` nulo colidir com o primeiro).
- [x] Normalization Engine: `web/src/normalization/registry.ts` (contrato `normalize(raw) por source:recordType`) + `manual.ts` (4 normalizers) + `ingest.ts` (orquestração raw→events, reaproveitável na Fase 2 e num futuro `/admin/reprocess`). Cobertura de teste com repositório fake em memória (sem tocar Supabase real).
- [x] PWA: `QuickEntryForm` (peso/hidratação/refeição/nota) + `WeightChart` (Recharts, adicionado como dependência) em `web/src/modules/registro/`, plugados na dashboard (`app/page.tsx`).
- [x] `npm test` (27 testes), `npm run typecheck`, `npm run lint`, `npm run build` verdes. Verificação visual em produção real via browser (login, leitura de `health_events` vazia, os 4 formulários renderizando) — sem submissão de dados de teste (ver item acima).
- [x] Branch `fase-1-ingestao` criada a partir de `main` (depois de fechar a Fase 0: mergeado `fase-0-fundacao` → `main` localmente, migrations 004/005 e notas da sessão anterior estavam prontas mas não commitadas).

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

## Depois (Fase 2)

- [ ] Fase 2 — sync automático (Health Connect)

## Decisões pendentes

- [ ] Modelo Gemini do free tier a usar no chat (validar na Fase 6)
- [ ] Estratégia de backup: GitHub Action semanal com pg_dump (ainda não definida; sem prazo fixo agora que a Fase 1 fechou)

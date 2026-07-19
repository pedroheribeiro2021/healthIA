# Registro de Sessões — HealthIA

Atualizado ao fim de cada sessão de desenvolvimento (convenção do vault Claude-Memoria).

---

## 2026-07-19 — Fundação do projeto (Cowork)

**Objetivo:** definir arquitetura/stack e deixar o repositório pronto para o desenvolvimento com Claude Code.

**Realizado:**
- Decisão de arquitetura: servidor local (Python/FastAPI + SQLite) + dashboard web (React/TS) + sync-app Android (Expo + Health Connect). IA plugável com Ollama como default. Custo zero, offline first.
- Documentação completa criada: `CLAUDE.md`, `docs/ARCHITECTURE.md` (componentes, protocolo de sync, ADRs), `docs/DATA_MODEL.md` (schema SQL, raw_records + health_events append-only), `docs/ENGINES.md` (contratos, Recovery Score v1, 7 regras de insight), `docs/ROADMAP.md` (fases 0–6 com critérios de pronto).
- Repositório git inicializado com conventional commits (hook `commit-msg` validando) e `CONTRIBUTING.md`.
- Vault Obsidian atualizado (`Projetos/README.md`).

**Decisões:**
- Payload bruto do Health Connect é enviado ao servidor; normalização acontece no servidor (permite reprocessar histórico).
- SQLAlchemy Core (não ORM) + repositórios com Protocol → troca futura para PostgreSQL sem dor.
- Dados de saúde (`*.db`) nunca versionados no git.

**Pendências / próximos passos:** ver [Pendencias.md](Pendencias.md) — começar pela Fase 0 do roadmap.

---

## 2026-07-19 — Fase 0: Fundação do monorepo

**Objetivo:** executar a Fase 0 do roadmap — scaffold de `server/`, `dashboard/` e `sync-app/` com testes verdes.

**Realizado:**
- `server/`: projeto uv (Python 3.12+, FastAPI, Pydantic v2, SQLAlchemy Core). `app/main.py` com app factory + lifespan que roda as migrations no start. `GET /health`.
- Migration runner (`app/repositories/sqlite/migrations.py`, sqlite3 puro por causa dos triggers com `BEGIN..END`) + `migrations/001_initial.sql` com o schema completo do DATA_MODEL.md, incluindo triggers de proteção append-only em `raw_records` e `health_events` (bloqueiam DELETE e UPDATE fora dos campos permitidos).
- `EventRepository`: `Protocol` em `app/domain/repositories.py` + implementação `SqliteEventRepository`.
- 7 testes pytest (health check, migrations idempotentes/schema completo/triggers, repositório) — todos verdes. `ruff check`/`ruff format` limpos.
- `dashboard/`: scaffold Vite + React + TS (`npm create vite -- --template react-ts`), boilerplate padrão do template removido, build validado.
- `sync-app/`: scaffold Expo (`create-expo-app --template blank-typescript`), `App.tsx` movido para `src/App.tsx` (consistente com a estrutura documentada em CLAUDE.md), `LICENSE` do template removida, typecheck validado. Nota: o scaffold do Expo cria `.claude/settings.json` habilitando o plugin oficial `expo@claude-plugins-official` — mantido (é comportamento padrão da ferramenta, não intervenção manual).
- `scripts/ci.sh`: CI local simples (lint + testes + build dos três apps), item que estava no critério da Fase 0.
- Branch `fase-0-fundacao` criada para o trabalho, conforme convenção do CONTRIBUTING.md.

**Decisões:**
- Migration runner usa `sqlite3` da stdlib diretamente (não SQLAlchemy Core) para poder rodar `executescript` com triggers multi-statement; repositórios seguem usando SQLAlchemy Core, mantendo a portabilidade exigida pela arquitetura.
- Triggers de append-only ficam na migration (camada permitida a ter SQL específico de dialeto).
- "CI local simples" da Fase 0 interpretado como script de shell (`scripts/ci.sh`), não pipeline em nuvem — coerente com o princípio offline first; não há decisão de usar GitHub Actions.

**Pendências / próximos passos:** ver [Pendencias.md](Pendencias.md) — começar pela Fase 1 (ingestão manual + fonte da verdade).

---

## 2026-07-19 (2) — Pivô de arquitetura: local → nuvem

**Objetivo:** revisar a arquitetura após questionamento do Pedro sobre acesso pelo celular.

**Realizado:**
- Discutidas 3 opções (nuvem, Tailscale, só local). Pedro escolheu **nuvem: Vercel + Supabase**, padrão dos seus outros apps.
- Decisão registrada em [ADR-001](ADR/ADR-001-migracao-para-nuvem.md).
- Documentação inteira reescrita para v2: `CLAUDE.md`, `README.md`, `docs/ARCHITECTURE.md`, `docs/DATA_MODEL.md` (Postgres/RLS), `docs/ENGINES.md` (interfaces TS), `docs/ROADMAP.md` (Fase 0 = Supabase + Vercel + deploy).
- Pendências da Fase 0 atualizadas.

**Decisões:** ver ADR-001. Destaques: analytics em TS puro (sem Python), Gemini free tier como IA default, PWA mobile-first como interface principal, princípio "offline first" revisado para "acessível em qualquer lugar, resiliente a offline".

**Próximos passos:** Fase 0 no Claude Code — criar projeto Supabase, scaffold Next.js, migration 001, auth e deploy.

---

## 2026-07-19 (3) — Arquivamento da stack local

**Contexto:** ao commitar a v2, descobri que uma sessão do Claude Code já havia implementado a Fase 0 na stack local (server/ FastAPI, dashboard/ Vite, sync-app/) e tinha Fase 1 parcial não commitada. Pedro confirmou manter o pivô para nuvem.

**Realizado:**
- Trabalho pendente da Fase 1 commitado na branch **`legacy-local`** (junto com toda a stack Python) — nada foi perdido.
- `main` limpa: só docs + notas na arquitetura v2 (Next.js + Supabase), pronta para a Fase 0 da v2.
- `.claude/` no .gitignore; `scripts/ci.sh` legado removido.

**Atenção:** se houver sessão do Claude Code aberta seguindo o roadmap antigo, encerrar antes de continuar — os docs em main agora descrevem a v2.

---

## 2026-07-19 (4) — Fase 0 (v2): push do repo + fundação Supabase/Next.js

**Objetivo:** publicar `main`/`legacy-local` no GitHub e executar a Fase 0 da v2 (Supabase + Next.js + Vercel).

**Realizado:**
- Push de `main` e `legacy-local` para `origin` (GitHub).
- Supabase: org já estava no limite de 2 projetos free (`rachaconta`, `zerosheet-judotracker`). Pedro decidiu reaproveitar o projeto `rachaconta` com um **schema dedicado `healthia`**, isolado de `public` — decisão registrada em [ADR-002](ADR/ADR-002-schema-compartilhado-supabase.md).
- 3 migrations aplicadas no projeto `rachaconta` (schema `healthia`): schema completo do DATA_MODEL.md (11 tabelas) + RLS + triggers de proteção append-only (`raw_records`, `health_events`); hardening pós-security-advisor (`to authenticated` explícito, `search_path` fixo nas funções trigger); restrição adicional para excluir sessões anônimas (o projeto compartilhado tem ~95 usuários anônimos de outro app — `auth.role() = 'authenticated'` sozinho os incluiria). Migrations versionadas em `web/supabase/migrations/`.
- Scaffold `web/`: Next.js 16 (App Router, Turbopack) + TS + Tailwind v4 + vitest + `@supabase/ssr`. Estrutura de pastas do monorepo (`domain/`, `repositories/`, `engines/*`, `modules/`, `normalization/`) criada.
- `domain/`: schemas zod para `raw_records` e `health_events` (+ testes), interface `EventRepository`.
- `repositories/`: implementação Supabase de `EventRepository`; clients browser/server via `@supabase/ssr`, `db.schema: "healthia"`; `databaseTypes.ts` escrito à mão (schema `healthia` não é enxergado por `generate_typescript_types` até ser exposto na Data API — ver Pendências).
- Auth: `proxy.ts` (renomeado de `middleware.ts` — convenção nova do Next.js 16) protege todas as rotas exceto `/login`; página de login (só `signInWithPassword`, sem cadastro) testada no browser contra o Supabase real — fluxo de erro ("Credenciais inválidas") confirmado ponta a ponta.
- PWA base: manifest, ícone SVG, service worker mínimo (installability, sem estratégia de cache ainda).
- `npm test`, `npm run typecheck`, `npm run build` verdes.
- Deploy Vercel: projeto `healthia` criado no time `pedroheribeiro2021's projects`, mas `deploy_to_vercel` retornou `403 forbidden` tanto para produção quanto para preview — permissão da conta/integração, não resolvível por ferramenta. App não está no ar ainda.

**Decisões:**
- Ver ADR-002 (schema compartilhado) e o achado de segurança sobre auth anônimo compartilhado.
- `NEXT_PUBLIC_*` só funciona no bundle do client com acesso estático (`process.env.NEXT_PUBLIC_X`), não dinâmico (`process.env[nome]`) — bug real encontrado e corrigido durante o teste no browser (`web/src/repositories/supabase/env.ts`).
- Node local é 20.20.2; `@supabase/supabase-js` recentes pedem Node ≥22 (warning, não erro). `engines` no `package.json` já pede ≥22 para alinhar com o build da Vercel; upgrade do Node local fica como melhoria, não bloqueio.

**Pendências / próximos passos:** ver [Pendencias.md](Pendencias.md) — a Fase 0 só fecha quando Pedro liberar a permissão de deploy na Vercel, conectar o repo Git ao projeto, configurar as env vars (incluindo `SUPABASE_SERVICE_ROLE_KEY`, que não foi buscado por ser secreto), expor o schema `healthia` na Data API do Supabase e criar sua conta real de auth.

---

## 2026-07-19 (5) — App em produção: Pedro logado no Vercel via browser

**Objetivo:** destravar o deploy (bloqueado por `403` na integração) com Pedro logado na Vercel pelo Chrome, e revisar se o vault estava atualizado antes de um `clear`.

**Realizado:**
- Pedro logou na Vercel no Chrome e conectou o repositório `pedroheribeiro2021/healthIA` ao projeto `healthia` (Project Settings → Git) — deploy automático via `git push` já ativo.
- Configuradas as 3 env vars do projeto (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) via dashboard — a secreta foi colada pelo próprio Pedro, nunca vista por mim (nem pela ferramenta MCP do Supabase, que só expõe chaves publicáveis).
- **Bug real da Vercel encontrado e contornado**: ao criar múltiplas env vars no mesmo formulário e alternar o toggle "Sensitive", a UI salvou o texto de *placeholder* do campo (ex.: `https://aBcDe.supabase.co`, `https://api.example.com`) como valor real, silenciosamente — sem erro nem aviso visual óbvio. Só foi descoberto pelo primeiro redeploy quebrar em runtime: `Error: Your project's URL and Key are required to create a Supabase client!`. Diagnosticado lendo os Logs do projeto no dashboard (a ferramenta MCP `get_runtime_errors`/`get_deployment` seguia dando 403/404 para este projeto mesmo com Pedro logado — a integração MCP tem escopo próprio, independente da sessão do browser). Corrigido apagando e recriando as 3 variáveis uma de cada vez, sem alternar o toggle depois de digitar o valor. Registrado no vault (`Global/Infra-Cloud-Compartilhada.md`) por ser um risco que pode se repetir em qualquer projeto Vercel do Pedro.
- Redeploy em produção bem-sucedido: **https://healthia-six.vercel.app** está no ar — `/` redireciona para `/login`, página renderiza sem erro.
- Vault Obsidian revisado e atualizado antes do `clear`: criado `Global/Infra-Cloud-Compartilhada.md` (limite de projetos free na org Supabase, risco de RLS com auth anônimo compartilhado no `rachaconta`, e agora o bug do toggle Sensitive na Vercel), linkado no `Índice.md`. Entrada do HealthIA em `Projetos/README.md` já estava correta, sem necessidade de mudança.

**Decisões:**
- Confirmado: a permissão MCP para a Vercel (`403 forbidden`) é um problema da integração/token, não da conta do Pedro — a sessão dele no browser tem acesso normal. Ferramentas MCP (`get_deployment`, `get_runtime_errors`, `list_projects`) continuam sem enxergar o projeto `healthia` mesmo depois disso; monitoramento de deploy/logs desse projeto por ora só funciona via browser.

**Pendências / próximos passos:** ver [Pendencias.md](Pendencias.md) — falta expor o schema `healthia` na Data API do Supabase (Project Settings → API → Exposed schemas) e criar a conta real do Pedro no Supabase Auth para o login funcionar de ponta a ponta em produção. Depois disso, trocar `healthia.is_authorized()` para travar no `auth.uid()` do Pedro (nova migration).

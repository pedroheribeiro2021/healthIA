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

---

## 2026-07-19 (6) — Usuário real do Pedro no Supabase Auth + RLS travada no UUID dele

**Objetivo:** seguir as pendências de login — criar a conta real do Pedro (`pedro@mail.com` / senha temporária `123456`) e travar a RLS nela.

**Realizado:**
- Confirmado via `curl` direto no endpoint REST (`Accept-Profile: healthia`) que o schema `healthia` segue não exposto na Data API (`406 PGRST106 Invalid schema: healthia`) — continua ação exclusiva do Pedro via Dashboard, sem tool MCP equivalente. Pedro optou por fazer esse passo por conta própria depois.
- Conta `pedro@mail.com` criada no projeto `rachaconta` via `execute_sql` (não existe tool MCP `auth.admin.createUser`, e `SUPABASE_SERVICE_ROLE_KEY` está vazia localmente) — INSERT direto em `auth.users` + `auth.identities` seguindo o padrão de seed documentado do Supabase (`pgcrypto`, `crypt()`/`gen_salt('bf')`). UUID resultante: `3fe469a5-84c9-41ee-b207-83e48da8a80b`.
- Migration `web/supabase/migrations/20260719190000_healthia_004_restrict_to_pedro_uuid.sql` aplicada: `healthia.is_authorized()` agora compara `auth.uid()` com esse UUID fixo, fechando a brecha (documentada na migration 003) de aceitar qualquer conta real futura no projeto compartilhado.
- `get_advisors` (security) revisado: os WARN "Anonymous Access Policies" nas tabelas `healthia.*` são falso positivo já esperado (linter não enxerga o corpo de `is_authorized()`) — nenhum achado novo.

**Decisões:**
- Criar usuário via SQL direto (em vez de esperar a Admin API/service_role) foi aceito porque é operação aditiva (INSERT) num projeto compartilhado, sem risco às contas de outros apps — diferente de expor schema, que é config de projeto e só existe via Dashboard.

**Pendências / próximos passos:** ver [Pendencias.md](Pendencias.md) — falta só o Pedro expor o schema `healthia` na Data API para o login funcionar de ponta a ponta em produção; depois, trocar a senha temporária `123456` por uma definitiva.

---

## 2026-07-20 — Fase 0 fechada: bug de GRANT faltante + login validado em produção

**Objetivo:** confirmar que o login funciona de ponta a ponta em produção depois que o Pedro expôs o schema `healthia` na Data API.

**Realizado:**
- Reteste do endpoint REST com `Accept-Profile: healthia`: o erro mudou de `406 PGRST106 Invalid schema` para `401 permission denied for schema healthia` — sinal de que o schema já estava exposto, mas faltava outra coisa.
- Investigado com `execute_sql` (`information_schema.role_table_grants` e `role_usage_grants`): **nenhuma migration anterior (001–004) tinha concedido `GRANT USAGE`/`SELECT`/`INSERT`/`UPDATE` no schema `healthia` para o role `authenticated`** — só `postgres` (dono das tabelas) tinha acesso. RLS por si só não é suficiente nesse caso: o Postgres verifica os grants de schema/tabela antes de sequer avaliar as policies. Esse era o bloqueador real, mascarado até agora pelo schema não estar exposto.
- Corrigido com a migration `web/supabase/migrations/20260720120000_healthia_005_grant_authenticated.sql` (aplicada via `apply_migration`).
- Validação de ponta a ponta:
  - `curl` direto no Auth API com `pedro@mail.com`/`123456` → token emitido para o UUID certo; leitura autenticada em `healthia.health_events` com esse token → `200 []`.
  - Browser real em `https://healthia-six.vercel.app/login`: login bem-sucedido, redireciona para `/`, mostra "Sessão ativa: pedro@mail.com" (dashboard vazio, aguardando Fase 3 — comportamento esperado).
- **Fase 0 (v2) considerada pronta.**

**Decisões:**
- Grants não incluem `DELETE` para `authenticated` — coerente com o princípio de fonte da verdade imutável (`raw_records`/`health_events` são append-only via trigger; as demais tabelas não têm caso de uso de exclusão pelo cliente hoje).

**Pendências / próximos passos:** ver [Pendencias.md](Pendencias.md) — só falta o Pedro trocar a senha temporária `123456` por uma definitiva. Próximo passo de desenvolvimento: Fase 1 (ingestão manual + pipeline raw→events + PWA instalável).

---

## 2026-07-20 (2) — Fase 1: ingestão manual + pipeline raw→events + PWA

**Objetivo:** implementar a Fase 1 do roadmap — `POST /api/v1/events/manual`, pipeline raw_records → Normalization → health_events, formulário de registro rápido e gráfico de peso no PWA.

**Realizado:**
- Antes de começar: commitados os arquivos da Fase 0 que a sessão anterior tinha aplicado no Supabase mas deixado sem commit (migrations 004/005 + `notas/`), e feito merge (`--ff-only`, local) de `fase-0-fundacao` em `main`. Branch `fase-1-ingestao` criada a partir de `main`.
- `domain/manualEntry.ts`: schemas zod para os 4 tipos de lançamento manual (peso, hidratação, refeição, nota) + mapeamento tipo → `record_type` (`WeightEntry`/`HydrationEntry`/`MealEntry`/`NoteEntry`).
- `normalization/payloadHash.ts`: sha256 do payload canônico (chaves ordenadas), para dedup determinístico.
- `normalization/manual.ts`: `buildManualRawRecord` (monta o `NewRawRecord` a partir do input validado) + 4 funções `normalize*Entry` (raw → health_event).
- `normalization/registry.ts`: contrato do Normalization Engine — `normalize(raw)` resolvido por `source:record_type`, documentado em ARCHITECTURE.md.
- `normalization/ingest.ts`: orquestração da pipeline completa (insere raw_record → normaliza → insere health_events → marca `norm_status`), reaproveitável por sync/admin em fases futuras. Erro de normalização não descarta o raw_record (fica `error`, pronto pra reprocesso).
- `app/api/v1/events/manual/route.ts`: rota REST thin (só parse/validação + chamada da pipeline).
- `modules/registro/QuickEntryForm.tsx` (client, seletor de tipo + campos dinâmicos) e `WeightChart.tsx` (Recharts, adicionado como dependência — já previsto no CLAUDE.md mas não instalado ainda). Plugados em `app/page.tsx`, que agora busca `health_events` de peso via `eventRepository` (Server Component) em vez do placeholder da Fase 0.
- 27 testes (vitest) cobrindo schemas, hash, normalizers e a orquestração de ingestão (com repositório fake em memória — sem tocar o Supabase real). `npm run typecheck`, `npm run lint` e `npm run build` verdes.

**Decisões:**
- **Dedup de lançamento manual usa `external_id = payload_hash`.** `raw_records` tem `unique nulls not distinct (source, external_id)` — como lançamentos manuais não têm um id externo natural, deixar `external_id` nulo faria o **segundo** lançamento manual de qualquer tipo colidir com o primeiro (Postgres trata dois `NULL` como iguais nesse tipo de constraint), travando a ingestão manual depois do primeiro registro. Usar o hash do payload como `external_id` resolve isso e mantém o dedup por conteúdo pretendido (reenvio idêntico = duplicate).
- **Orquestração raw→events mora em `normalization/ingest.ts`**, não em `app/api/`: a rota fica thin (CLAUDE.md) e a função é reaproveitável tal como está pelo endpoint de sync da Fase 2 e por um futuro `/admin/reprocess`.
- **Não foi feito teste de submissão real no browser contra o Supabase de produção.** `raw_records`/`health_events` são append-only (sem policy de DELETE) — qualquer lançamento de teste ficaria permanente na base real do Pedro. Validado em vez disso: suíte de testes automatizados (normalização/hash/orquestração com repositório fake) + build/typecheck/lint verdes + verificação visual no browser contra produção real (login, leitura de `health_events` vazia funcionando, os 4 formulários renderizando corretamente) sem clicar em "Registrar". O teste de ponta a ponta com dado real (registrar peso pela rua) fica para o Pedro — é literalmente o critério de "pronto" do roadmap.
- Branch `fase-1-ingestao` criada e commitada; **ainda não mergeada em `main` nem enviada ao GitHub** — push/merge/deploy ficam pendentes de confirmação do Pedro (deploy automático na Vercel dispara a partir do push).

**Pendências / próximos passos:** ver [Pendencias.md](Pendencias.md) — Pedro: revisar o código, decidir sobre merge/push (dispara deploy), depois testar o registro de peso pelo celular em produção. Próximo passo de desenvolvimento: Fase 2 (sync automático via Health Connect).

---

## 2026-07-20 (3) — Bug real: deploy da Vercel quebrado por Root Directory nunca salvo

**Objetivo:** o push da Fase 1 (`fase-1-ingestao`) e do fechamento da Fase 0 (`main`) quebrou o build na Vercel — investigar e corrigir.

**Realizado:**
- Primeira hipótese (errada): que `npm install recharts` tinha corrompido o `package-lock.json`, removendo as entradas `@next/swc-*` necessárias pro build Linux da Vercel. Descartada depois de descobrir que o `grep -o ... | wc -l`/`sort -u` usado pra checar o lockfile dá **falso negativo** neste ambiente Bash (Windows/Git Bash) — confirmado via Python que o lockfile sempre teve as 8 plataformas corretas, e via `rm -rf node_modules && npm ci && npm run build` limpo (idêntico ao que a Vercel roda) que build e lockfile estavam sempre saudáveis.
- Causa raiz real, encontrada inspecionando o dashboard da Vercel pelo browser (a integração MCP não enxerga o projeto `healthia` — ver Pendencias.md): o campo **Root Directory** (Settings → Build and Deployment) estava **vazio**, nunca tinha sido salvo como `web`. A Vercel tem um heurístico de auto-detecção de framework que às vezes achava o Next.js em `web/` mesmo assim, mascarando o bug em builds anteriores; sem esse heurístico funcionar (ou com cache indo por outro caminho), o erro mudava de cara a cada tentativa — ora "couldn't find app directory", ora "No Next.js version detected" — mas a causa era sempre a mesma configuração ausente.
- Corrigido preenchendo `web` e salvando (confirmado com reload completo da página que persistiu). Redeploy de `fase-1-ingestao` (preview, ~59s) e de `main`/produção (~39s) confirmados **Ready**, sem nenhum warning de lockfile.
- Adicionado `.github/workflows/ci.yml` (rodando `npm ci`, igual à Vercel, + lint/typecheck/test/build) a pedido do Pedro, pra pegar esse tipo de problema antes do deploy.
- Push de `main` e `fase-1-ingestao` feito (bloqueado inicialmente pelo classificador de modo automático do Claude Code para `git push`; destravado depois de confirmação explícita do Pedro no chat).

**Decisões:**
- Registrado como aprendizado de ferramenta: não confiar em `grep -o ... | wc -l` / `| sort -u` neste ambiente Bash — usar Python ou `grep -c` direto para contagens/verificações de conteúdo de arquivo.
- MCP da Vercel não enxerga o projeto `healthia` (`list_projects` não retorna) mesmo com `list_teams` funcionando — escopo da integração, não corrigível por ferramenta; só o dashboard via sessão de browser do Pedro funciona. Fica pendência dele reautorizar o escopo.

**Pendências / próximos passos:** ver [Pendencias.md](Pendencias.md) — decidir sobre merge de `fase-1-ingestao` em `main`, depois testar registro de peso real pelo celular.

---

## 2026-07-20 (4) — Fase 1 mergeada em produção; Fase 2 (sync automático) implementada

**Objetivo:** Pedro reautorizou o escopo da integração MCP da Vercel; pediu pra avançar para a próxima fase do roadmap.

**Realizado:**
- Confirmado via `list_projects` que o MCP da Vercel agora enxerga `healthia`.
- Pedro já tinha mergeado `fase-1-ingestao` → `main` direto pelo GitHub (PR #1) enquanto eu investigava o deploy — só sincronizei o `main` local (fast-forward) em vez de tentar dar push. Deploy de produção do merge confirmado `READY` via `list_deployments` (commit `f83bc3c2`).
- **Fase 2 — lado servidor** (branch `fase-2-sync`, a partir de `main`):
  - Pesquisado via `WebFetch` o formato real dos tipos de registro do `react-native-health-connect` (SleepSession, ExerciseSession, HeartRate, HeartRateVariabilityRmssd, Steps, Weight, BodyFat, Hydration, Nutrition — incluindo `metadata.id`, unidades de Mass/Volume/Energy e os enums numéricos de sleep stage/exercise type/meal type) direto do código-fonte da lib no GitHub, pra não normalizar em cima de suposição.
  - `domain/healthConnect.ts` (schemas zod desses 9 tipos) + `normalization/units.ts` (conversores de unidade pra SI, com testes) + `normalization/healthConnect.ts` (9 normalizers) + `registry.ts` estendido com as chaves `health_connect:*`.
  - `POST /api/v1/sync/batch` (`normalization/syncBatch.ts` + rota): idempotente, um item que falha não derruba o lote inteiro, contrato `{accepted, duplicates, failed}` de docs/ARCHITECTURE.md.
  - **Autenticação de API repensada**: o sync-app não tem cookies de navegador, só um JWT do Supabase. Criado `repositories/supabase/auth.ts` (`authenticateRequest`) que aceita cookie **ou** `Authorization: Bearer`, e `repositories/supabase/bearerClient.ts`. `proxy.ts` não intercepta mais `/api/*` — cada rota autentica a si mesma e responde 401 em JSON (antes, uma chamada de API sem sessão seria redirecionada pra `/login`, o que não faz sentido pra um cliente não-navegador). `eventRepository.ts` ganhou `createEventRepositoryFromClient` (fábrica pura) além do `createSupabaseEventRepository` (cookie-based) já existente; a rota de eventos manuais também foi migrada pro novo padrão de auth.
  - 50 testes no total (22 novos), typecheck/lint/build verdes.
- **Fase 2 — sync-app** (Expo + TypeScript, reaproveitando o scaffold básico já commitado em `legacy-local`):
  - Login com a conta do Pedro (Supabase); sessão persistida via `expo-secure-store` com um adapter que fragmenta valores grandes em vários itens (a sessão do Supabase passa do limite de ~2KB por item do SecureStore — padrão documentado pelo próprio Supabase pra Expo).
  - `lib/healthConnect.ts` (init, permissões, leitura paginada), `lib/recordMapping.ts` (registro → item do lote, `external_id = metadata.id`), `lib/queue.ts` (fila local em `expo-sqlite` + tabela de último sync por tipo), `lib/sync.ts` (orquestração: puxa do Health Connect desde o último sync — ou 30 dias no primeiro sync, limite de retenção documentado — enfileira, envia em lote com `Authorization: Bearer`), `background/backgroundSync.ts` (`expo-task-manager`/`expo-background-fetch`, best-effort).
  - `HomeScreen`/`LoginScreen` minimalistas: pedir permissão, botão "sincronizar agora", status da última sincronização.
  - `npm install` + `tsc --noEmit` rodados de verdade (dependências resolvem, sem erro de tipo) — é o máximo que dá pra verificar sem um Android com Health Connect. **O app nunca foi executado.**
  - `CLAUDE.md` (raiz) atualizado: comando antigo (`expo start`) estava errado pra esse caso — Health Connect exige dev client (`expo prebuild` + `expo run:android`), não roda no Expo Go.

**Decisões:**
- **Não simulei/testei o sync-app rodando de verdade.** Health Connect só existe em Android real (ou emulador com Play Store + Health Connect instalado), e este ambiente não tem nenhum dos dois. Diferente do teste de peso da Fase 1 (que eu escolhi não fazer por prudência com dado de produção), aqui é uma limitação de ambiente, não de escolha — o código está no melhor estado que dá pra alcançar sem execução real.
- `external_id` dos registros do Health Connect = `metadata.id` (id do próprio registro na origem) — diferente da Fase 1, onde lançamentos manuais precisaram do hash do payload como `external_id` por não terem um id natural.
- `proxy.ts` não protege mais `/api/*`: cada rota autentica explicitamente (cookie ou Bearer). Mudança deliberada, não só pra suportar o sync-app — uma rota de API redirecionar (302) uma chamada não-autenticada pra uma página HTML de login sempre foi um contrato ruim pra um cliente REST.
- `fase-2-sync` criada a partir de `main` (que já inclui a Fase 1). Não mergeada — depende do teste real do Pedro no celular dele.

**Pendências / próximos passos:** ver [Pendencias.md](Pendencias.md) — Pedro: testar peso real na Fase 1 (produção); rodar o sync-app num Android real com Health Connect (`expo prebuild` + `expo run:android`) e decidir sobre o merge da Fase 2 depois disso. Próximo passo de desenvolvimento: Fase 3 (Analytics core + Dashboard real), mas só depois da Fase 2 estar "pronta" pelo critério dela.

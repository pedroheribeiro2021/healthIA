# Inventário — HealthIA (auditoria F0)

> Auditoria somente-leitura. Nenhum arquivo de código foi alterado para produzir este relatório.
> Base: `CLAUDE.md`, `docs/ARCHITECTURE.md`, `docs/DATA_MODEL.md`, `docs/ENGINES.md`, `docs/ROADMAP.md`,
> `notas/Registro-de-Sessoes.md`, `notas/Pendencias.md`, `notas/ADR/*`, e leitura direta do código em
> `web/src`, `web/supabase/migrations`, `sync-app/src`.
>
> Data da auditoria: 2026-09-11. A última entrada em `notas/Registro-de-Sessoes.md` é de 2026-08-24/26
> (diagnóstico do crash do sync-app, sessão interrompida). Não há registro de sessão nas ~2 semanas
> seguintes — logo, para tudo que depende de uso real em produção (dado novo, `habit.adherence.avg7d`,
> validação do sync), este relatório só pode reportar o que as notas confirmam até 26/08; não houve
> acesso ao banco de produção nesta auditoria para verificar o estado atual dos dados.

---

## 1. MAPA

### 1.1 Workspaces

| Workspace | O que é | Roda? | Deploy |
|---|---|---|---|
| `web/` | Next.js 16 (App Router, Turbopack) + TS + Tailwind v4 — dashboard PWA + API REST + todos os engines. | Sim. `npm test` nesta auditoria: 49 arquivos de teste completaram com sucesso (247 testes), mas 2 arquivos (`src/normalization/syncBatch.test.ts`, `src/normalization/healthConnect.test.ts`) estouraram timeout do worker do Vitest nesta máquina (`[vitest-pool-runner]: Timeout waiting for worker to respond`) — não é possível concluir se é um teste quebrado ou limitação do ambiente local; sessões anteriores (`notas/Registro-de-Sessoes.md`, última: 286 testes verdes em 2026-08-22) sempre reportaram os dois arquivos verdes. | Vercel, produção em `https://healthia-six.vercel.app` (confirmado `READY` pela última vez em `notas/Registro-de-Sessoes.md`, sessão de 2026-08-22, commit `6854f40`). |
| `sync-app/` | Expo + `react-native-health-connect` — lê Health Connect (Galaxy Watch 8 via Samsung Health), fila local SQLite, envia a `POST /api/v1/sync/batch`. | Código compila (`tsc --noEmit` reportado verde em sessões anteriores). **Não roda de forma confiável em produção**: o build `preview` (standalone) instalado no celular do Pedro abre e fecha sozinho (crash silencioso, sem stack trace visível) — diagnóstico interrompido em 2026-08-24/26, aguardando captura de log via `adb logcat` (`notas/Pendencias.md`, seção "Em andamento"). Não há evidência de sync automático funcionando desde 22/07/2026. | Só builds Expo/EAS (`development`/`preview`), sem publicação em loja. Nenhum "deploy" contínuo — cada teste exige gerar um build novo manualmente. |
| `dashboard/` | **Não é um workspace do projeto atual.** Contém só `dist/` e `node_modules/` — resíduo de build do scaffold Vite/React da v1 local (Python/FastAPI + SQLite), arquivada na branch `legacy-local` e removida de `main` no commit `a0b7d24` ("refactor!: remove stack local Python"). `git ls-files dashboard` não retorna nada — o diretório **não está versionado**, não consta no `.gitignore`, e não é mencionado na estrutura do monorepo em `CLAUDE.md`. | Não. | Não. |

### 1.2 Rotas do Next.js App Router

**Páginas (`page.tsx`):**

| Rota (arquivo) | O que a tela faz | Fonte dos dados |
|---|---|---|
| `src/app/page.tsx` | Home ("Hoje"): sessão ativa, banner de recomendações abertas, check-in de hábitos do dia (navegável por `?day=`), cards de visão geral (Recovery/Sono/FC/Peso/Treinos/Passos), gráfico de tendência de Recovery. | `metricRepository.getLatestDailySummary()`, `metricRepository.listMetricSnapshots()`, `recommendationRepository.listByStatus("open")`, `habitService.getTodayHabitStates`/`getHabitWeek` — todos Supabase real, nenhum mock. |
| `src/app/registro/page.tsx` | Formulário de lançamento rápido (peso/hidratação/refeição/nota) + gráfico de peso sobreposto com bioimpedância. | `eventRepository.listHealthEvents` (`weight`, `body_composition`); grava via `POST /api/v1/events/manual`. |
| `src/app/plano/page.tsx` | Metas ativas, grade semanal de hábitos, e uma seção "Referências" (regras de alimentação, porções, cardápio, receitas, suplementação, lista de compras recorrente). | Metas/semana: `goalService.listGoalsWithProgress`, `habitService.getHabitWeek` (Supabase real). **"Referências" é conteúdo 100% estático**, importado de `src/content/planoSaude.ts` (transcrito de `docs/PLANO-SAUDE.md`) — não vem de nenhuma tabela. |
| `src/app/metas/page.tsx` | Metas ativas + formulário de criação + metas desativadas. | `goalService.listGoalsWithProgress` (Supabase real). **Órfã de navegação** — ver seção 7. |
| `src/app/evolucao/page.tsx` | Hub sem conteúdo próprio; `redirect("/evolucao/corpo")`. | — |
| `src/app/evolucao/layout.tsx` | Envolve as 4 sub-rotas com `EvolucaoSubNav`. | — |
| `src/app/evolucao/corpo/page.tsx` | Gráfico relógio × bioimpedância clínica (% gordura), cards de tendência (gordura/massa magra), formulário de bioimpedância. | `eventRepository.listHealthEvents("body_composition")`, `getMetricSeries(metricRepo, "body.fatpct.daily"/"body.leanmass.daily")`. |
| `src/app/evolucao/sono/page.tsx` | Gráfico de duração de sono (30d) + comparativo semana × semana anterior. | `getMetricSeries(metricRepo, "sleep.duration.daily")`, `compare()`. |
| `src/app/evolucao/exercicios/page.tsx` | Gráfico de carga de treino/ACWR + lista de treinos. | `getMetricSeries` (`training.load.daily`/`.acwr`), `eventRepository.listHealthEvents("workout")`. |
| `src/app/evolucao/relatorios/page.tsx` | Relatório semanal/mensal (toggle) com progresso das metas. | `reportService.generateReport` (reaproveita `daily_summary` + `compare()`/`analyzeTrend()`). Links de toggle (linhas 31 e 41) apontam para `/relatorios?type=...`, a própria rota antiga que agora é só um redirect — ver seção 7. |
| `src/app/insights/page.tsx` | Recomendações abertas, insights recentes (30d), correlações descobertas (60d). | `insightRepository.listActive`, `recommendationRepository.listByStatus("open")`, `insightService.listCorrelations`. |
| `src/app/exames/page.tsx` | Histórico de marcadores laboratoriais (agrupados por marcador, com badge fora-da-faixa) + import assistido por foto + formulário manual. | `eventRepository.listHealthEvents("lab_result")` — agrupamento por `marker` feito **na própria página** (linhas 16–34), não num engine (ver seção 7). |
| `src/app/nutricao/page.tsx` | Lista de receitas, formulário de nova receita, link "Sugerir receita com IA", lista de compras. | `recipeRepository.listRecipes`, `shoppingListRepository.listByStatus("open")`. |
| `src/app/nutricao/receitas/[id]/page.tsx` | Detalhe de receita: ingredientes, macros totais/por porção. | `recipeRepository`, `nutrition/recipeService` (puro). |
| `src/app/chat/page.tsx` | Chat com IA (aceita `?q=` pré-preenchido). | `ChatPanel` (client) consome `POST /api/v1/ai/chat` (SSE). |
| `src/app/mais/page.tsx` | Menu: Nutrição, Exames, Chat, Registro + Sair. | Links estáticos, sem dado. |
| `src/app/login/page.tsx` | Login (só `signInWithPassword`, sem cadastro). | Supabase Auth. |
| `src/app/corpo/page.tsx`, `src/app/sono/page.tsx`, `src/app/exercicios/page.tsx` | `permanentRedirect()` de uma linha para `/evolucao/{seção}`. | — |
| `src/app/relatorios/page.tsx` | `permanentRedirect()` para `/evolucao/relatorios`, preservando `?type=`. | — |

**Rotas de API (`route.ts`, todas em `src/app/api/v1/`):**

`sync/batch` (POST, ingestão sync-app) · `events/manual` (POST, lançamento rápido) · `imports/bioimpedance` (POST) · `imports/lab` (POST) · `summary/daily` (GET) · `metrics/[metricId]` (GET) · `insights` (GET) · `recommendations` (GET) · `recommendations/[id]/done` (POST) · `correlations` (GET) · `recipes`, `recipes/[id]`, `recipes/[id]/ingredients` (CRUD) · `shopping-list`, `shopping-list/[id]/bought` (GET/POST) · `goals`, `goals/[id]`, `goals/[id]/deactivate` (GET/POST/PATCH) · `habits`, `habits/[slug]/log`, `habits/week` (GET/POST/DELETE) · `foods` (GET, busca) · `reports` (GET) · `ai/chat` (POST, SSE) · `ai/extract-exam` (POST) · `cron/daily` (GET, protegida por `CRON_SECRET`) · `admin/recompute` (POST).

Todas são "thin": autenticam (`authenticateRequest`), validam com zod, chamam um service/engine, retornam — nenhuma lógica de negócio embutida na rota em si (a única exceção leve é o agrupamento por marcador em `exames/page.tsx`, que é uma *página*, não uma rota de API).

### 1.3 Tabelas do Supabase (`web/supabase/migrations`)

Schema `healthia`, 13 tabelas + 1 bucket de Storage, em 9 migrations (`20260719...` a `20260730140100_..._009_seed_habits_goals.sql`).

| Tabela | Colunas (resumo) | Escreve (código) | Lê (código) |
|---|---|---|---|
| `raw_records` | `source, record_type, external_id, payload jsonb, payload_hash, device_id, received_at, norm_status, norm_error` | `eventRepository.insertRawRecord` — chamado por `events/manual`, `sync/batch`, `imports/bioimpedance`, `imports/lab` (via `normalization/ingest.ts`) | `eventRepository.listPendingRawRecords` (reprocesso) |
| `health_events` | `event_type, start_time, end_time, value, unit, detail jsonb, source, raw_record_id, superseded_by` | `eventRepository.insertHealthEvents`, chamado pelos mesmos 4 caminhos acima após normalização | Praticamente todo o app: `analyticsService`, `habitService`, páginas de `/registro`, `/evolucao/*`, `/exames`, `contextBuilder` |
| `recipes` | `name, servings, instructions, source, archived` | `POST /api/v1/recipes` (`NewRecipeForm`) | `/nutricao`, `/nutricao/receitas/[id]` |
| `recipe_ingredients` | `recipe_id, food_name, quantity, unit, kcal, protein_g, carbs_g, fat_g, micros jsonb` | `POST /api/v1/recipes/[id]/ingredients` (`AddIngredientForm`) | detalhe de receita, `recipeService` |
| `foods` | `name, per_100g jsonb` | **Nenhum código de app.** Só a migration de seed (`20260721233000_..._007_seed_foods.sql`, 93 itens). `GET /api/v1/foods` é a única rota, sem POST. | `AddIngredientForm` (busca), `recipeService` |
| `shopping_list_items` | `food_name, quantity, unit, status, origin_recipe_id` | `POST /api/v1/shopping-list`, `POST .../bought` | `ShoppingList.tsx` |
| `goals` | `metric_id, target_value, direction, deadline, active` | `POST /api/v1/goals`, `PATCH /api/v1/goals/[id]`, `POST .../deactivate` | `/metas`, `/plano`, `goalService`, regras `weightTrendVsGoal`/`proteinBelowTarget` |
| `metric_snapshots` | `metric_id, period_start, period_end, value, detail jsonb, algo_version` | `metricRepository.upsertMetricSnapshots`, chamado por `analyticsService.recomputeDay` (via cron diário e `POST /api/v1/admin/recompute`) | `engines/analytics/queries.ts`, quase todas as telas de `/evolucao/*` |
| `insights` | `rule_id, severity, title, body, evidence jsonb, period_start, period_end, dismissed` | `insightRepository.insertInsight`, chamado por `insightService.recomputeInsights` (cron/admin recompute) | `/insights` |
| `recommendations` | `insight_id, action_type, title, body, priority, status` | `recommendationRepository.insert...`, via `recommendationService.refreshRecommendations` (cron/admin recompute); `status` muda via `POST /api/v1/recommendations/[id]/done` | `/insights`, banner da home |
| `daily_summary` | `day, sleep_duration_s, sleep_score, resting_hr, hrv_rmssd, steps, workouts, training_load, kcal_in, protein_g, water_l, weight_kg, recovery_score, habit_adherence_pct, body_fat_pct` | `metricRepository.upsertDailySummary`, via `analyticsService.recomputeDay` — **mas `kcal_in`/`protein_g`/`water_l` são gravados como `null` sempre** (`analyticsService.ts:285-287`), ver seção 2 | Home, `/evolucao/relatorios`, `goalService`, `contextBuilder`, várias regras de insight |
| `habits` | `slug, name, category, kind, unit, target_per_day, target_per_week, source_kind, priority, sort_order, active` | **Nenhum código de app.** Só a migration de seed (`..._009_seed_habits_goals.sql`, 9 hábitos). `habitRepository.ts` não expõe `insert`/`update`, só `listActiveHabits`. | `CheckinCard`, `WeekGrid`, `analyticsService` |
| `habit_logs` | `habit_id, day, done, quantity, note, logged_at` | `POST`/`DELETE /api/v1/habits/[slug]/log` (`habitRepository.upsertLog`/`deleteLog`) | `habitService`, `analyticsService` (adesão) |
| Storage `exams` (bucket) | arquivos de laudo (PDF/imagem) | `POST /api/v1/imports/lab` (upload opcional) | não há tela que liste os arquivos do bucket — só o `lab_result` derivado é mostrado em `/exames` |

---

## 2. TABELAS VAZIAS NA PRÁTICA

Esta é a seção mais importante do relatório, conforme pedido.

### 2.1 SEM-ESCRITA de verdade (tabela inteira, sem caminho de app)

- **`healthia.foods`** — SEM-ESCRITA. Só existe o seed da migration 007 (93 alimentos). `web/src/app/api/v1/foods/route.ts` só tem `GET`. Não há formulário, import ou rota para adicionar um alimento novo — se um alimento não estiver nos 93, a receita não pode usá-lo (a menos que se digite os macros manualmente linha a linha em `recipe_ingredients`, que é uma tabela diferente).
- **`healthia.habits`** — SEM-ESCRITA. Só existe o seed da migration 009 (9 hábitos). `web/src/repositories/habitRepository.ts:68-127` expõe `listActiveHabits`, `listLogs`, `upsertLog`, `deleteLog` — nenhum método cria ou edita um hábito. Não dá para adicionar/remover/editar um hábito pela aplicação; só via SQL direto ou nova migration.
- **`healthia.insights.dismissed`** — coluna SEM-ESCRITA. `web/src/repositories/insightRepository.ts` só tem `insertInsight`, `findActiveByRuleAndPeriod` e `listActive` (todos filtram `dismissed = false`); não existe `update`/`dismiss`. Diferente de `recommendations.status`, que tem `POST .../done`, um insight nunca pode ser marcado como visto — ele só some da lista quando a regra para de disparar para aquele período. Isso é coerente com o relato de "190 insights abertos" na sessão de 2026-08-22 (`notas/Registro-de-Sessoes.md`).

### 2.2 A mais grave: colunas hardcoded a `null`, apesar de haver dado de origem real

**`healthia.daily_summary.kcal_in`, `.protein_g`, `.water_l`** — a *linha* de `daily_summary` é escrita todo dia (cron/admin recompute), mas essas três colunas específicas são gravadas como `null` incondicionalmente:

```
web/src/engines/analytics/analyticsService.ts:274-292
  const summary: NewDailySummary = {
    ...
    kcalIn: null,
    proteinG: null,
    waterL: null,
    ...
  };
```

Isso acontece **mesmo que existam eventos reais** `meal` e `hydration` em `health_events` (escritos via `POST /api/v1/events/manual`, formulário `QuickEntryForm` em `/registro`) — a função busca `hydrationEvents` (linha 122-126) mas só usa esse array para o cálculo de adesão de hábito (`derivedEvents`, linha 155), nunca para popular `waterL`. Não existe, em `web/src/engines/analytics/calculators/`, nenhum calculator de nutrição (`computeKcalInDaily`, `computeProteinDaily`, `computeWaterDaily` não existem) — apesar de `docs/ENGINES.md:21` documentar `nutrition.protein.daily` / `nutrition.kcal.balance7d` como parte do catálogo de métricas, essas métricas **não constam em `web/src/engines/analytics/catalog.ts:15-120`** (`METRIC_CATALOG`). O mesmo vale para `lab.<marker>.latest`/`.trend`, também documentados em `docs/ENGINES.md:23` e ausentes do catálogo — `/exames` calcula isso na própria página em vez de via engine (ver seção 7).

Agravante adicional, específico de proteína: mesmo que a agregação existisse, o formulário `QuickEntryForm.tsx` (tipo "Refeição", linhas 162-211) só coleta `description`, `mealType` e `kcal` — **não há campo de proteína na UI**, embora `domain/manualEntry.ts:30` aceite `proteinG` opcionalmente na API. Ou seja, a lacuna existe em duas camadas independentes: a UI nunca envia proteína, e o Analytics Engine não agregaria mesmo que recebesse.

Efeito em cascata (todos leem `daily_summary.kcalIn/proteinG/waterL`, sempre `null`):
- Meta "Proteína diária (média 7 dias)" (`nutrition.protein.avg7d`, `web/src/engines/goals/goalMetrics.ts:42-46`) — criável em `/metas`, mostraria "sem dado suficiente" para sempre.
- `/evolucao/relatorios`: campos "Proteína", "Calorias consumidas", "Hidratação" (`web/src/engines/reports/reportBuilder.ts:21-23`) sempre "dados insuficientes".
- Regra de insight `protein_below_target` (`web/src/engines/insights/rules/proteinBelowTarget.ts:13,23`) nunca dispara.
- Contexto da IA (`web/src/engines/ai/contextBuilder.ts:45`) sempre cita `proteina=— kcal=—` para o chat/"Sugerir receita com IA".

---

## 3. TELAS QUE MENTEM

1. **Botões +/- de água** — `web/src/modules/rotina/CheckinCard.tsx:83-111` (`stepQuantity`) e `:183-204` (render). Cada toque soma/subtrai exatamente `1` (linha 85: `Math.max(0, (row.quantity ?? 0) + delta)`, chamado com `delta = ±1` nas linhas 188 e 199). O hábito "Água" tem `unit: 'l'` e `target_per_day: 3.0` (`web/supabase/migrations/20260730140100_..._009_seed_habits_goals.sql:8`) — ou seja, **cada clique soma 1 litro**. O número renderizado (linha 193, `{row.quantity ?? 0}`) não tem nenhuma unidade ao lado — não há "L", "ml" nem tooltip. Sem olhar a migration, é impossível saber pela UI que um clique = 1 litro inteiro (não 250 ml, não 1 copo). Isso é uma gravação em `habit_logs.quantity`, **não** cria um `health_event` de hidratação — é um caminho de dado paralelo ao formulário de `/registro`.
2. **Meta de proteína** (`nutrition.protein.avg7d`) — mostraria "sem dado suficiente" (`web/src/modules/metas/GoalCard.tsx:169`) para sempre, não porque falte proteína registrada, mas porque a agregação nunca foi implementada (seção 2.2). Tecnicamente não é um valor inventado — é honesto ao mostrar "sem dado" — mas é enganoso porque parece um problema de falta de uso, quando é um bug de pipeline.
3. **"Sugerir receita com IA"** (`web/src/app/nutricao/page.tsx:32-37`) — o link promete sugerir "dentro dos macros que ainda faltam, baseado no meu resumo diário", mas o resumo diário nunca tem kcal/proteína reais (seção 2.2) — a IA responderia sem noção real do que já foi consumido.
4. **`/evolucao/relatorios`** — campos "Proteína", "Calorias consumidas", "Hidratação" sempre "dados insuficientes pra comparar os períodos", mesma causa raiz.
5. **Card de peso na home** — **não mente.** `web/src/modules/dashboard/OverviewCards.tsx:66-69`: `summary.weightKg !== null ? ... : "—"`. Vem de `daily_summary.weight_kg`, calculado por `computeWeightDaily` a partir de eventos `weight` reais; não há valor mock/hardcoded. Mostra "—" quando de fato não há dado (linha 68), não inventa número.
6. **Meta de percentual de gordura** (`body.fatpct.avg7d`) — **também não mente estruturalmente.** `bodyFatPctResult` (`analyticsService.ts:149,291`) vem de `computeBodyFatPctDaily` sobre eventos reais `body_composition`. Se hoje mostra "sem dado suficiente" em `/plano`, é porque a bioimpedância mais recente (23/07/2026, ver `notas/Pendencias.md`) já não cai na janela móvel de 7 dias a partir de "hoje" (e mais ainda agora, 2026-09-11) — é dado real ficando velho, não um valor fabricado.
7. **`/metas`** — não mostra dado falso, mas é uma tela órfã e duplicada (ver seção 7); alguém que chegue nela por link direto vê um formulário de criação de meta funcional e paralelo ao de `/plano`, sem nenhuma indicação de que a tela "oficial" é outra.

---

## 4. O QUE ESTÁ VIVO

Fluxos com caminho de dado real, do input até a tela, confirmados por código (e por verificação em produção registrada nas notas de sessão até 2026-08-22):

- **Lançamento manual → gráfico**: `/registro` (`QuickEntryForm`) → `POST /api/v1/events/manual` → `raw_records` → `normalization/manual.ts` → `health_events` → lido de volta na mesma página (peso) e em `/evolucao/*` depois do recompute.
- **Bioimpedância clínica → `/evolucao/corpo`**: `BodyCompositionForm` → `POST /api/v1/imports/bioimpedance` → mesma pipeline → `computeBodyFatPctDaily`/`computeLeanMassDaily` → gráfico relógio × clínica.
- **Exame laboratorial manual → `/exames`**: `LabResultForm` → `POST /api/v1/imports/lab` → `health_events` (`lab_result`) → badge fora-da-faixa e regra `lab_out_of_range`.
- **Receita → macros**: `NewRecipeForm` + `AddIngredientForm` → `recipes`/`recipe_ingredients` → `engines/nutrition/macros.ts` (puro) → `/nutricao/receitas/[id]`.
- **Hábitos (log manual) → check-in/streak/adesão**: `CheckinCard`/`WeekGrid` → `POST/DELETE /api/v1/habits/[slug]/log` → `habit_logs` → `habitStats.ts` (streak) e `analyticsService` (adesão do dia) → `daily_summary.habit_adherence_pct`.
- **Hábitos derivados (`musculacao`, `agua`, `dormir_cedo`)**: leem `health_events` diretamente (`derivedHabits.ts`), com fallback documentado para log manual quando não há dado do relógio no dia.
- **Cron/recompute → Analytics → Insights → Recommendations**: `GET /api/v1/cron/daily` (Vercel Cron, 09:00 UTC) e `POST /api/v1/admin/recompute` rodam `recomputeDay`/`recomputeRange` → `metric_snapshots`/`daily_summary` → `insightService.recomputeInsights` → `recommendationService.refreshRecommendations`. Confirmado com dado real em produção em sessões anteriores (regra `acwr_high` disparando com ACWR real do Pedro, `notas/Pendencias.md`).
- **Metas → progresso**: `/plano` e `/metas` calculam "valor atual" a partir de `daily_summary` via `goalMetrics.currentValueForGoal` — real para as métricas que têm coluna populada (sono, FC, HRV, peso, recovery, adesão, gordura, treinos/semana); quebrado só para proteína (seção 2.2).

**Plano alimentar**: **não existe, em nenhum grau.** Busca por "plano alimentar"/"planejamento alimentar" no código não retorna nada. Confirmado como decisão consciente de escopo desde a Fase 5 (`docs/ROADMAP.md:48`: "Desvio: sem planejamento alimentar... fica pra quando houver necessidade real de agendar refeições") e reafirmado na Fase 7 (`notas/Pendencias.md:51`: "Planejamento alimentar e cadastro das receitas ficam fora"). Hoje registrar uma refeição (`/registro`) e cadastrar uma receita (`/nutricao`) são dois fluxos sem nenhuma ligação — não há calendário, não há vínculo receita↔refeição registrada.

**Importador de exame por foto**: implementado (ADR-006, 2026-08-22) e estruturalmente correto — `AIProvider.completeWithImage` → `extractLabMarkersFromImage` (`web/src/engines/ai/examExtraction.ts`) → `LabImportFromFile.tsx` exige revisão linha a linha antes de qualquer `POST /api/v1/imports/lab` real (a IA nunca grava sozinha). Porém: **nunca foi testado com uma chamada real de IA e um laudo de verdade** — a única verificação registrada foi "até a borda do provider" sem `GEMINI_API_KEY` configurada localmente (resposta 503 esperada). `notas/Pendencias.md:19` lista isso como pendência explicitamente ainda aberta: "Testar a extração de exame por IA com um laudo real em produção".

---

## 5. ENGINES

`web/src/engines/` — implementado, com teste (vitest), por subárea:

| Engine | Implementado | Teste | Observação |
|---|---|---|---|
| `analytics/calculators/*` (8 arquivos: sleep, restingHr, hrv, trainingLoad, acwr, weight, bodyComposition, habits) | Sim, funções puras | Sim, 1:1 (`*.test.ts` para cada) | Cobertura completa dos calculators listados no catálogo. |
| `analytics/{rollup,period,comparisonEngine,trendAnalyzer,correlationFinder,catalog,stats/basic}.ts` | Sim | Sim | — |
| `analytics/queries.ts` | Sim (thin wrapper de leitura) | **Não tem teste próprio** | Aceitável — é I/O puro sobre o repositório, não lógica de cálculo. |
| `analytics/analyticsService.ts` (`recomputeDay`/`recomputeRange`) | Sim, mas com a lacuna de nutrição descrita na seção 2.2 | Sim (`analyticsService.test.ts`) — o teste não cobre `kcalIn`/`proteinG`/`waterL` porque a função nunca tenta calculá-los | **Nenhuma métrica de nutrição (`nutrition.*`) existe no catálogo nem em nenhum calculator** — documentada em `docs/ENGINES.md` mas nunca implementada. |
| `insights/rules/*` (11 regras) | Sim | Sim, 1:1 | 7 regras originais (`docs/ENGINES.md`) + 4 da Fase 7 (`habitAdherenceDrop`, `habitStreakBroken`, `stairsBelowTarget`, `weightPlateauLowAdherence`). |
| `insights/{insightService,ruleEngine}.ts` | Sim | Sim | — |
| `recommendations/*` | Sim | Sim | — |
| `goals/goalMetrics.ts` | Sim | Sim | Contém o `nutrition.protein.avg7d` que nunca resolve (seção 2.2). |
| `goals/goalService.ts` | Sim (I/O) | **Não tem teste próprio** | — |
| `habits/{derivedHabits,habitStats}.ts` | Sim | Sim | — |
| `habits/habitService.ts` | Sim (I/O) | **Não tem teste próprio** | — |
| `nutrition/{macros,recipeService}.ts` | Sim | Sim | Cobre só macros de receita, não a agregação diária (que não existe). |
| `reports/reportBuilder.ts` | Sim | Sim | — |
| `reports/reportService.ts` | Sim (I/O) | **Não tem teste próprio** | — |
| `ai/{adapter,chatService}.ts` | Sim | **Não tem teste próprio** | — |
| `ai/{contextBuilder,examExtraction}.ts` | Sim | Sim | — |
| `ai/providers/{gemini,anthropic,openai,sse}.ts` | Sim | Sim (via `fetch` mockado) | **Nunca testado contra a API real** de nenhum provider (`notas/Pendencias.md`) — só mock. |

Nenhum engine é "esqueleto" no sentido de stub vazio; todos os arquivos listados em `engines/` têm implementação real. O gap estrutural é a ausência completa de um domínio inteiro (nutrição diária) que a documentação promete e o schema suporta, não um arquivo malfeito.

### Onde a IA calcula em vez de só explicar (princípio 2 do CLAUDE.md)

- **Nenhum engine determinístico chama IA.** Confirmado por grep: `AIProvider`/`getAIProvider` só aparecem em `engines/ai/*` e nas duas rotas que os usam (`ai/chat`, `ai/extract-exam`). Nenhum calculator, insight rule ou recommendation policy referencia IA.
- **Ponto de tensão único, já endereçado por ADR**: `engines/ai/examExtraction.ts` (import de exame por foto) pede à IA que **leia números de uma imagem** (marcador/valor/unidade/faixa de referência de um laudo) e devolva JSON. Isso não é "calcular um indicador" no sentido do princípio 2 — a IA não decide se está fora da faixa (isso continua em `insights/rules/labOutOfRange.ts`) nem grava nada sozinha (o resultado é só sugestão, confirmada linha a linha em `LabImportFromFile.tsx` antes de um `POST /api/v1/imports/lab` real). O racional está em `notas/ADR/ADR-006-extracao-de-exame-via-ia.md`. É uma leitura defensável do princípio, mas é a única fronteira cinzenta no sistema — vale ter em mente se o escopo da extração crescer (ex.: a IA passar a somar valores, estimar tendência, etc., o que aí sim violaria o princípio).
- **`contextBuilder.ts`** monta o prompt só com dado já calculado (`daily_summary`, metas, insights com `evidence`, recomendações abertas) — consistente com "IA nunca recebe dado bruto para calcular" (`docs/ENGINES.md:118-120`).

---

## 6. DESIGN

**Não existe design system, tokens ou tema no sentido formal.**

- `web/src/app/globals.css` define exatamente 2 variáveis CSS: `--background` e `--foreground` (mais os aliases automáticos do `@theme inline` do Tailwind v4), com um único `@media (prefers-color-scheme: dark)` trocando essas duas. Não há tokens de cor de marca, espaçamento, raio, tipografia ou elevação — nenhuma paleta customizada em `tailwind.config.*` (não existe um arquivo desses; Tailwind v4 é config-free via `@theme`, e o projeto não estendeu nada).
- **51 de 57 arquivos `.tsx`** (fora testes — não há nenhum `.test.tsx` no projeto, ver seção 7) usam classes Tailwind com cores literais da paleta padrão diretamente no JSX (`neutral-*`, `emerald-*`, `red-*`, `amber-*`, `blue-*`, `rose-*`, `yellow-*`) — cada componente escolhe sua própria paleta ad hoc: `bg-neutral-900 dark:bg-neutral-100`, `border-emerald-500`, `text-red-600` etc., repetidos componente a componente sem nenhuma camada de abstração (nenhum `Button`/`Card`/`Badge` compartilhado — `src/components/` só tem `NavBar`, `LogoutButton`, `RegistroFab`, `EvolucaoSubNav`, `WeekComparisonCard`, nenhum deles um primitivo de UI genérico).
- **4 arquivos** têm cor em hex literal fora do Tailwind: `modules/registro/WeightChart.tsx`, `modules/exercicios/TrainingLoadChart.tsx`, `modules/corpo/WatchVsScaleChart.tsx` (cores de série do Recharts) e `app/layout.tsx`. Um quinto arquivo, `modules/charts/chartTheme.ts`, centraliza hex literal para tooltip/eixo dos 6 gráficos (`#737373`, `#ffffff`, `#e5e5e5`, `#171717`) — comentário no próprio arquivo (linhas 1-7) explica que é necessário porque o Recharts não herda `className`; é a única concessão de design *compartilhada* do projeto, o resto é 100% Tailwind solto por componente.

---

## 7. DÍVIDA

- **`/metas` é uma rota órfã e duplicada.** `src/app/metas/page.tsx` implementa criação/edição/desativação de meta, mas não está em `NavBar.tsx` (só tem Hoje/Plano/Evolução/Insights/Mais) nem em `mais/page.tsx` (`SECTIONS`, linhas 4-9) nem em nenhum outro link do app (`grep "href=\"/metas\""` não retorna nada). `/plano` cobre metas de forma mais limitada (sem formulário de criação nem lista de desativadas). Provável resíduo da Fase 6, nunca removido/unificado quando `/plano` nasceu na Fase 7.
- **Redirect duplo em `/evolucao/relatorios`.** Os links de toggle Semanal/Mensal (`src/app/evolucao/relatorios/page.tsx:31,41`) apontam para `/relatorios?type=...` — a própria rota antiga, que hoje é só `permanentRedirect()` (`src/app/relatorios/page.tsx`). Cada troca de toggle passa por um 308 desnecessário em vez de linkar direto para `/evolucao/relatorios?type=...`.
- **`insights.dismissed` sem caminho de escrita** (repetido da seção 2, incluído aqui como dívida de UX): insights se acumulam indefinidamente, sem "arquivar"/"marcar como visto" equivalente ao `done` de `recommendations`.
- **Agrupamento por marcador feito na página, não num engine**: `src/app/exames/page.tsx:16-34` monta `byMarker` (parse de `detail`, filtro, sort) diretamente no Server Component — pequena mas real infração do princípio "regra de negócio vive nos engines" (`CLAUDE.md`), já que a lógica correspondente a `lab.<marker>.trend` nunca foi implementada como calculator.
- **`sync-app/package.json`**: duas bibliotecas de Health Connect declaradas — `expo-health-connect` (`^0.1.1`, linha 11) e `react-native-health-connect` (`^3.5.3`, linha 15). Só a segunda é importada em código (`sync-app/src/lib/healthConnect.ts:6`); a primeira é dependência não usada.
- **`dashboard/`** (raiz do repo) é resíduo não versionado do scaffold Vite da v1 (ver seção 1.1) — ocupa espaço em disco, não referenciado por nada, não mencionado na estrutura do monorepo em `CLAUDE.md`.
- **Nenhum teste de componente React existe** — `@testing-library/react`/`@testing-library/jest-dom` estão instalados e `vitest.setup.ts:1` importa os matchers, mas nenhum `*.test.tsx` existe (`find src -name '*.test.tsx'` → 0 resultados) contra 56 arquivos `*.test.ts` de lógica pura. Coerente com a doutrina do projeto ("todo score/métrica: função pura + teste"), mas significa que toda a camada de apresentação (inclusive os pontos "mentirosos" da seção 3) está fora de qualquer rede de segurança automatizada.
- **Nenhum `TODO`/`FIXME`/`HACK`/`XXX`** encontrado em `web/src` (`grep` limpo) — não há marcador de dívida deixado no código; toda a dívida real está implícita (funções que nunca foram escritas, não comentadas como pendentes).
- **Suíte de teste nesta auditoria**: 2 arquivos (`syncBatch.test.ts`, `healthConnect.test.ts`) não completaram por timeout do worker do Vitest nesta máquina — ver seção 1.1. Sem uma segunda execução limpa não dá para afirmar se é falha de teste ou do ambiente.
- **Migrations**: as 9 migrations estão em ordem cronológica consistente pelos nomes de arquivo e não há evidência de migration aplicada fora de ordem — mas `notas/Registro-de-Sessoes.md` (sessão 2026-07-30) documenta que 008/009 foram aplicadas via `supabase db query --linked --file` em vez de `supabase db push`, e que 001-007 precisaram de `supabase migration repair --status applied` porque o histórico de tracking do CLI (`supabase_migrations.schema_migrations`) não sabia que elas já existiam (aplicadas antes por outra via, provavelmente a ferramenta MCP do Supabase). Ou seja: o *schema* está consistente, mas o *histórico de tracking do CLI* teve que ser remendado manualmente — risco latente para a próxima migration nova nesse projeto Supabase compartilhado (`rachaconta`).

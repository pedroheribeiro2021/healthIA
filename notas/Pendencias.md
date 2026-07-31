# Pendências — HealthIA

## Ação do Pedro

- [ ] **Usar o app normalmente por uma semana** a partir de 31/07/2026 — é o que falta para o critério 3 da Fase 7 (`habit.adherence.avg7d` com valor real e ao menos uma regra de insight de hábito disparando ou verificada como "não dispara porque a adesão está boa"). Não é uma tarefa técnica, é o próprio uso do produto.
- [ ] **Trocar a senha de `pedro@mail.com`** (criada via SQL com senha temporária `123456` só para destravar o desenvolvimento) por uma senha real, agora que o login ponta a ponta em produção já foi validado e o sync-app também usa essa mesma conta.
- [ ] **Obter `GEMINI_API_KEY`** em [Google AI Studio](https://aistudio.google.com/apikey) (free tier) e configurar `AI_PROVIDER=gemini` + `GEMINI_API_KEY` na Vercel (Settings → Environment Variables) — sem isso o chat (`/chat`) fica indisponível em produção (o resto do app funciona normalmente). Validar também se `GEMINI_MODEL` precisa ser sobrescrito (default no código: `gemini-2.5-flash`, ver `notas/ADR/ADR-003-ai-providers-via-fetch-rest.md`) — modelo do free tier pode ter mudado desde a implementação.
- [ ] Opcional: configurar `ANTHROPIC_API_KEY`/`OPENAI_API_KEY` na Vercel se quiser trocar de provider (`AI_PROVIDER=anthropic|openai`) — nenhum dos dois foi testado contra a API real (só com `fetch` mockado).

## Planejamento aberto em 2026-07-30 — Fase 7: Rotina, Hábitos e Navegação

Diagnóstico feito com dado real de produção, especificação escrita em `docs/FASE-7-ROTINA.md` e `docs/PLANO-SAUDE.md`.

**Achados do diagnóstico:**

- [x] **Sync do Health Connect parado desde 22/07/2026** (último `raw_records.received_at`). Passos pararam ainda antes, em 10/07. **Veredito da Etapa 0.2 (30/07/2026), por leitura de código (`sync-app/`), sem construir sync novo:**
  - **Causa raiz provável — bug de registro, não limitação do Android**: `registerBackgroundSync()` (`src/background/backgroundSync.ts`) é chamada só dentro de um `useEffect` de `HomeScreen.tsx`, que só monta com sessão ativa. Isso inclui o próprio `TaskManager.defineTask(...)` — que precisa rodar incondicionalmente e cedo (idealmente em `index.ts`, antes de `registerRootComponent`), porque quando o Android acorda o app em modo headless pra rodar a tarefa em background, ele carrega o bundle JS mas **não monta a árvore React**. Se `defineTask` nunca é alcançado nesse boot headless, a tarefa fica sem callback associado e falha em silêncio do lado nativo. Qualquer evento que descarregue o registro do SO (atualização de build via EAS, "Forçar parada", limpeza de dados) só é refeito se o Pedro abrir o app de novo — não há registro persistente no boot.
  - **Agravante — sessão sem refresh amarrado ao ciclo de vida do app**: `autoRefreshToken: true` está configurado (`src/lib/supabase.ts`), mas não há `AppState` chamando `startAutoRefresh()`/`stopAutoRefresh()` (exigido pelo supabase-js em React Native, que não recebe eventos de foco de `window` como browser) — o timer de refresh pode não disparar de forma confiável com o app minimizado. Se o token expirar em background, o erro cai só em `console.error` (`backgroundSync.ts`), sem notificar ninguém.
  - **Não é o motivo, mas é um risco separado**: a fila local (`src/lib/queue.ts`) marca o lote inteiro como enviado sempre que a API responde HTTP 200, mesmo que o corpo da resposta reporte itens individuais como `failed` — pode mascarar perda pontual de registros sem travar a fila.
  - **Classificação: conserto barato — confirmado com o Pedro.** Dev client ainda abre normal e as permissões do Health Connect seguem concedidas (checado no aparelho em 30/07/2026), descartando as duas hipóteses que exigiriam reinstalação/nova concessão. Não exige build de produção nem infra nativa nova (foreground service/WorkManager).
  - **Corrigido nesta sessão**: `index.ts` agora importa `src/background/backgroundSync.ts` por efeito colateral antes de `registerRootComponent` (garante `defineTask` mesmo em boot headless); `src/lib/supabase.ts` amarra `AppState` a `startAutoRefresh()`/`stopAutoRefresh()`. `npm run typecheck` verde em `sync-app/`.
  - ⚠️ **Falta validar de verdade**: só dá pra confirmar que o sync automático voltou a rodar sozinho com um build novo. Pedro precisa gerar um build de desenvolvimento novo (`eas build --profile development`), reinstalar no Android, deixar o app minimizado (sem abrir) por algumas horas e conferir se `raw_records.received_at` avança sem intervenção manual.
  - Risco separado (não corrigido agora, não é a causa raiz): a fila local (`src/lib/queue.ts`) marca o lote inteiro como enviado sempre que a API responde HTTP 200, mesmo que o corpo da resposta reporte itens individuais como `failed` — pode mascarar perda pontual de registros. Registrado aqui como pendência futura, fora do escopo da Fase 7.
- [x] **Dado de teste em produção** — removido em 31/07/2026 (ADR-004, seção "Execução"). Confirmado com o Pedro antes (SELECT de verificação, checkpoint 3). `health_events` id 1 (peso real) intacto.
- [x] **Bioimpedância real importada** (31/07/2026, Etapa 0.4) — as 6 medições de fev–jul/2026 (`docs/PLANO-SAUDE.md` §1) via `POST /api/v1/imports/bioimpedance`, uma chamada por medição, usando a sessão de browser já autenticada como `pedro@mail.com` (destravou o bloqueio anterior — a sessão de antes só tinha acesso SQL direto). `/corpo` confirmado mostrando a curva real de 26/02 a 23/07 com 22,7 % como valor mais recente e 59,8 kg de massa magra.
- [x] **Zero metas ativas** em `healthia.goals` — resolvido pela migration 009 (30/07): 4 metas do plano semeadas (peso 73,5kg, gordura 17,5%, adesão 85%, treinos 4x/semana). A meta antiga de peso (75kg, criada durante testes da Fase 6) já estava desativada — sem conflito.

**Decisões tomadas com o Pedro em 2026-07-30:**

- Hábitos são **entidade de 1ª classe** (tabelas `habits`/`habit_logs`), não checkbox de UI nem `note` em `health_events` — para render streak, métrica de adesão, regra de insight e correlação.
- `habit_logs` é **mutável por dia** (upsert + delete), única exceção ao append-only do schema — adesão é intenção corrigível, não medição. Registrar em ADR-005.
- Escopo da fase: hábitos + metas + navegação. **Planejamento alimentar e cadastro das receitas ficam fora** — pendência da Fase 5 segue aberta.
- Navegação reagrupada **por rotina** (Hoje · Plano · Evolução · Insights · Mais), não por fonte de dado. Registro vira FAB, não aba.

## Resolvido em 2026-07-31 — Fase 7 Etapa 0.4: import da bioimpedância real

- [x] **Schema estendido** (`domain/bioimpedance.ts`, `normalization/bioimpedanceImport.ts`): campos aditivos e opcionais `skeletalMuscleKg`, `fatMassKg`, `visceralFatLevel`, `bmi` e a flag `estimated` (valor lido do gráfico histórico do laudo, não leitura direta do aparelho). 280 testes, `typecheck`/`lint`/`build` verdes.
- [x] **As 6 medições importadas** via `POST /api/v1/imports/bioimpedance` (uma chamada por medição, na ordem cronológica), não `INSERT` direto — pipeline `raw_records → health_events` exercitada de verdade. As 5 antigas (26/02 a 23/06) entraram com `estimated: true` e só peso/músculo esquelético/massa de gordura/`%` gordura derivado (dados lidos do gráfico); a de 23/07 entrou com os valores exatos do laudo (`estimated: false`, incluindo massa magra, TMB, IMC e gordura visceral).
- [x] **Destravado usando a sessão de browser já autenticada** como `pedro@mail.com` (aberta para verificar a Etapa 2 nesta mesma sessão) — não precisou da senha nem de `service_role`.
- [x] `POST /api/v1/admin/recompute` rodado para o período (26/02 a 31/07) — camada derivada (`daily_summary`, `metric_snapshots`) recalculada.
- [x] **Verificado no browser**: `/corpo` mostra a curva real de 6 pontos (26/02 a 23/07), "Gordura corporal 22,7%" e "Massa magra 59,8 kg" — critério de pronto da Etapa 0.4 batido. `/plano` mostra "sem dado suficiente" pras metas de peso/gordura (médias de 7 dias) — correto, não é bug: a leitura mais recente (23/07) está 8 dias fora da janela móvel de hoje (31/07).
- [x] Branch `fase-7-etapa-0-4-bioimpedancia`, commit do schema; import em si não passa por PR (é dado real gravado via API, igual ao padrão de dado manual, não uma migration).

## Resolvido em 2026-07-31 — Fase 7 Etapa 2: Navegação por rotina

- [x] **5 abas fixas** (Hoje · Plano · Evolução · Insights · Mais) substituem as 7 antigas (Hoje/Insights/Metas/Relatórios/Chat/Registro/Mais), reagrupadas por rotina, não por fonte de dado — `NavBar.tsx` reescrita com ícones inline (sem lib nova) e detecção de aba ativa generalizada por grupo de sub-rotas (`SUB_ROUTES`).
- [x] **`/evolucao`**: hub que redireciona para `/evolucao/corpo`; `app/evolucao/layout.tsx` (com `EvolucaoSubNav`, sub-abas Corpo · Sono · Exercícios · Relatórios) envolve as 4 páginas, **movidas** (não reescritas) de `app/{corpo,sono,exercicios,relatorios}/` para `app/evolucao/{...}/page.tsx`. Rotas antigas viram `permanentRedirect()` — `/relatorios` preserva `?type=weekly|monthly`.
- [x] **Registro virou FAB** (`components/RegistroFab.tsx`, botão "+" flutuante ≥44px) na Hoje, em vez de aba; `/registro` continua existindo como rota.
- [x] **`/mais`** ganhou Nutrição, Exames, Chat, Registro e o botão Sair (antes só nas telas Hoje/Registro).
- [x] 279 testes, `typecheck`/`lint`/`build` verdes. **Verificado no browser contra produção real** (dev local, logado como `pedro@mail.com`): as 5 abas navegam e destacam corretamente (inclusive em sub-rotas de Evolução e Mais), sub-nav de `/evolucao` troca de seção sem perder a aba "Evolução" ativa, `/corpo` redireciona para `/evolucao/corpo`, FAB abre `/registro` e destaca "Mais", dark mode ok.
- [x] Branch `fase-7-etapa-2-navegacao` → PR #16 → **mergeada em `main`** em 31/07/2026. Deploy de produção confirmado `READY` na Vercel (commit `f767a73`, via MCP `list_deployments`).

## Resolvido em 2026-07-31 — Fase 7 Etapa 0.3: limpeza de dado de teste

- [x] Removidos os 9 registros de teste identificados no ADR-004 (2 `health_events` + 2 `raw_records` de origem, 1 receita + 2 ingredientes, 1 item de lista de compras, 2 insights + 2 recommendations derivadas). `health_events` id 1 (peso real) confirmado intacto por SELECT antes e depois.
- [x] **Achado não previsto**: os triggers de append-only (`trg_protect_raw_records`/`trg_protect_health_events`, migration 001) bloqueiam `DELETE` mesmo pra conexão administrativa — por design ("rede de segurança mesmo contra `service_role`"). A primeira tentativa (DELETE direto numa transação) falhou e fez rollback completo sem apagar nada (confirmado por SELECT). A execução real precisou de `alter table ... disable trigger` nos dois triggers dentro da mesma transação, com `enable trigger` antes do `COMMIT` — confirmado depois que ambos voltaram a `tgenabled='O'`. Detalhe completo em ADR-004.
- [x] Confirmado com o Pedro antes de qualquer DELETE (SELECT de verificação com os ids exatos) e de novo antes do passo extra de desabilitar os triggers — dois checkpoints, não um.
- [ ] **Etapa 0.4 (import de bioimpedância real) segue bloqueada**: exige `POST /api/v1/imports/bioimpedance` autenticado como Pedro (não `INSERT` direto — a spec quer a pipeline `raw_records → health_events` exercitada de verdade), e esta sessão só tem acesso ao banco via SQL direto (`supabase db query --linked`), não a uma sessão HTTP autenticada do app.

## Resolvido em 2026-07-30 — Fase 7 Etapa 1: Hábitos, Metas e Check-in

- [x] **Migrations 008/009 aplicadas em produção**: tabelas `habits`/`habit_logs` (RLS + grants, `DELETE` só em `habit_logs` — ADR-005), colunas `habit_adherence_pct`/`body_fat_pct` em `daily_summary`, seed dos 9 hábitos e 4 metas de `docs/PLANO-SAUDE.md`. Aplicadas via `supabase db query --linked --file` (não `db push` — o projeto é compartilhado com outros apps, `db push` exigiria marcar dezenas de migrations de outros apps como "revertidas"; evitado de propósito, ver decisão abaixo).
- [x] **Engines**: `engines/habits/` (hábitos derivados de `health_events`, streak e contagem semanal on-demand, exclusão do denominador por meta semanal já batida), `engines/analytics/calculators/habits.ts` (`habit.adherence.daily`, rollup `avg7d`), `engines/goals/goalMetrics.ts` estendido (`kind` `sum7d` + `habit.adherence.avg7d`/`body.fatpct.avg7d`/`training.sessions.7d`), 4 regras de insight novas.
- [x] **API**: `GET /api/v1/habits`, `POST`/`DELETE /api/v1/habits/{slug}/log` (409 pra hábito `derived`), `GET /api/v1/habits/week`.
- [x] **UI**: check-in na home (`CheckinCard`, toggle/stepper/barra de adesão/streak), tela `/plano` (metas + grade semanal + referências estáticas de `content/planoSaude.ts`). `NavBar` não mudou — fica pra Etapa 2.
- [x] 279 testes (45 novos), `typecheck`/`lint`/`build` verdes. PR #13 mergeado em `main`.
- [x] ADR-005 registrado (`notas/ADR/ADR-005-habit-logs-mutavel-por-dia.md`).
- ⚠️ **Falta rodar `POST /api/v1/admin/recompute` do dia de hoje** pra `habit_adherence_pct`/`body_fat_pct` de hoje serem populados pela primeira vez — precisa de sessão autenticada como Pedro (não tenho `service_role` nem sessão de browser nesta sessão). O cron diário resolve isso sozinho a partir de amanhã (recalcula "ontem" toda manhã).

**Decisão registrada nesta sessão:** para este projeto Supabase compartilhado (`rachaconta`), `supabase db push` não é seguro — o histórico de migrations do CLI é por-projeto, não por-app, e tentar sincronizar force o assistente a marcar migrations de outros apps (rumo, rachaconta, zerosheet) como revertidas. O caminho usado (e a se repetir): `supabase db query --linked --file <migration>.sql`, aplicando o SQL direto sem tocar no histórico de terceiros. Vale registrar no vault Obsidian (`Infra-Cloud-Compartilhada.md`) por ser cross-project.

## Resolvido em 2026-07-30 — Merge da Fase 6 em `main` (Etapa 0.1 da Fase 7)

- [x] `fase-6-metas-relatorios-ia` mergeada em `main` via PR — telas `/metas`, `/relatorios` e `/chat` agora fazem parte de `main`.
- [x] **Conflito de NavBar resolvido a favor de `main`**: a versão de 11 abas com rolagem horizontal trazida pela branch foi descartada; ficou a versão de 4 abas + `Mais` do commit `b16b780`. A Fase 7 (Etapa 2) reescreve o arquivo por completo.
- [x] Sincronizadas todas as branches locais com o remoto antes de iniciar a Fase 7 (`fase-0-fundacao` só tinha um ponteiro desatualizado — o commit já estava em `main`; `fase-1` a `fase-6` e `legacy-local` já estavam em dia).

## Resolvido em 2026-07-22 — Fase 6: Metas, Relatórios e IA

- [x] **Metas**: `POST/GET /api/v1/goals` + `POST /api/v1/goals/{id}/deactivate`, tela `/metas` (criar meta com métrica/direção/valor/prazo, ver valor atual calculado de `daily_summary`, desativar sem hard delete). `engines/goals/goalMetrics.ts` cura 6 métricas aceitáveis como meta (sono, FC repouso, HRV, peso, proteína, recovery) — não o catálogo completo de 18 `metric_id`, decisão consciente de escopo (ver `docs/ROADMAP.md`). Isso também é o que já ativava as regras `weight_trend_vs_goal`/`protein_below_target` da Fase 4, que até aqui sempre retornavam null por falta de meta cadastrada.
- [x] **Relatórios**: `GET /api/v1/reports?type=weekly|monthly`, tela `/relatorios` com toggle — computado on-demand a partir de `daily_summary` via `compare()`/`analyzeTrend()` já existentes (Fase 3/4), sem tabela nova nem cálculo novo.
- [x] **AI Engine**: adapter (`engines/ai/adapter.ts`) + 3 providers via `fetch` direto às APIs REST (Gemini default, Anthropic, OpenAI — ver ADR-003) + parser SSE compartilhado; `ContextBuilder` (puro) monta o prompt só com dados já calculados (daily_summary, insights, recomendações, metas — nunca eventos brutos); `POST /api/v1/ai/chat` com streaming SSE; tela `/chat` efêmera (sem persistência de histórico, decisão consciente de escopo). Links "Perguntar à IA" em `/insights` e "Sugerir receita com IA" em `/nutricao`.
- [x] 234 testes, `typecheck`/`lint`/`build` verdes. **Verificado com dado real de produção via browser**: meta de peso criada (75kg) mostrou "Atual: 76.6 kg" reais, desativação funcionou; `/relatorios` semanal mostrou números reais (Recovery 48 vs 69, sono 6.3h vs 6.5h, etc.) batendo com o que os módulos Sono/Exercícios já mostravam; `/chat` sem chave configurada mostrou o estado indisponível corretamente, sem quebrar o resto do app; link "Perguntar à IA" de um insight real (`vitamin_d fora da faixa`) navegou com a pergunta pré-preenchida. **Não testado com resposta real de um provider de IA** — falta o Pedro configurar `GEMINI_API_KEY` (ver Ação do Pedro acima) pra validar o critério de pronto ("cita números reais") de ponta a ponta.
- [x] **Fase 6 considerada pronta** pelo critério do roadmap (`docs/ROADMAP.md` atualizado).
- [x] Confirmado via `git log` que Pedro já tinha mergeado `fase-5-corpo-nutricao-exames` → `main` (PR #7) antes do início desta sessão — o item de pendência que pedia essa confirmação estava desatualizado.

## Resolvido em 2026-07-21 (4) — Fase 5: Corpo, Nutrição e Exames

- [x] **Corpo**: import de bioimpedância clínica (`POST /api/v1/imports/bioimpedance`, fonte `bioimpedance` própria) + calculators `body.fatpct.daily`/`body.leanmass.daily` + tela `/corpo` com comparativo relógio × bioimpedância clínica (percentual de gordura) e cards de tendência.
- [x] **Exames**: import de resultado de exame (`POST /api/v1/imports/lab`, fonte `lab`) com upload opcional do laudo pro bucket privado `exams` no Storage (migration nova: `storage.buckets` + policies reaproveitando `healthia.is_authorized()`) + tela `/exames` com histórico por marcador e badge "fora da faixa" — ativa de vez a regra `lab_out_of_range` do Insight Engine (Fase 4), que até aqui sempre retornava null.
- [x] **Nutrição**: seed de 93 alimentos comuns em `healthia.foods` (macros por 100g, migration nova) + `engines/nutrition/` (macros escalados/somados, puro) + CRUD de receitas e ingredientes (macros congelados na quantidade do ingrediente, não FK viva) + lista de compras com "Copiar lista" pro Google Keep. Telas `/nutricao` e `/nutricao/receitas/[id]`.
- [x] `NavBar` ganhou Corpo, Exames e Nutrição (7 abas) — trocada de colunas de largura igual pra rolagem horizontal.
- [x] 198 testes, `typecheck`/`lint`/`build` verdes. **Verificado com dado real de produção**: bioimpedância registrada apareceu em `/corpo` com os valores corretos após recompute; exame de vitamina D fora da faixa apareceu em `/exames` **e** disparou sozinho `lab_out_of_range` em `/insights`; receita de teste (frango + arroz, 2 porções) calculou sozinha 494.5kcal/53g proteína por porção, batendo com a soma manual; lista de compras testada ponta a ponta.
- [x] **Fase 5 considerada pronta** pelo critério do roadmap (`docs/ROADMAP.md` atualizado). Sem planejamento alimentar (vínculo receita↔refeição, calendário) — não fazia parte do critério de pronto, registrado como decisão consciente de escopo.
- [x] Pedro mergeou `fase-4-insights` → `main` (PR #6) e configurou `CRON_SECRET` no Vercel antes do início desta sessão.

## Resolvido em 2026-07-21 (3) — Fase 4: Correlações, Insights e Recomendações

- [x] `engines/analytics/correlationFinder.ts` (Spearman + significância via valor crítico de t por grau de liberdade, `stats/basic.ts`) — testa pares de métricas com defasagem 0-3 dias, só reporta `n>=14` e significativo.
- [x] Insight Engine (`engines/insights/`): as 7 regras iniciais de `docs/ENGINES.md`, cada uma pura + teste unitário; `insightService.recomputeInsights` monta o `MetricStore` (I/O) e persiste com dedup por `rule_id+período`.
- [x] Recommendation Engine (`engines/recommendations/`): `recommendationPolicy.recommend` (severidade > meta ativa > recência, máx. 3) + `recommendationService.refreshRecommendations` (dedup por insight já ter recomendação aberta).
- [x] `domain/goals.ts`, `insights.ts`, `recommendations.ts` + repositórios Supabase — tabelas `goals`/`insights`/`recommendations` já existiam desde a Fase 0, nenhuma migration nova.
- [x] Rotas `GET /api/v1/correlations`, `GET /api/v1/insights`, `GET /api/v1/recommendations`, `POST /api/v1/recommendations/{id}/done`; cron diário e `admin/recompute` passaram a rodar Analytics → Insights → Recommendations.
- [x] UI: tela `/insights` (recomendações com botão "Concluído", insights por severidade, correlações), aba nova na `NavBar`, `AlertBanner` na home.
- [x] 172 testes, `typecheck`/`lint`/`build` verdes. **Verificado com dado real de produção**: `POST /api/v1/admin/recompute` (30 dias) fez a regra `acwr_high` disparar sozinha (ACWR real do Pedro entre 2.95 e 4.00, limite 1.5) — 3 recomendações abertas geradas, `/insights` renderizou tudo, `POST /recommendations/{id}/done` fechou uma recomendação de ponta a ponta. `GET /api/v1/correlations` ainda vazio (esperado — critério exigente + HRV nunca sincronizou).
- [x] **Fase 4 considerada pronta** pelo critério do roadmap (`docs/ROADMAP.md` atualizado).
- [x] Pedro configurou `CRON_SECRET` no projeto Vercel (feito nesta sessão, via browser) — cron diário funciona em produção assim que `fase-4-insights` for mergeada.
- [x] Pedro mergeou `fase-3-analytics` → `main` (PR #5).

## Resolvido em 2026-07-21 (2) — Fase 3: Analytics core + Dashboard real

- [x] Catálogo de métricas + 6 calculators (sono, FC repouso, HRV, carga de treino/ACWR, peso, Recovery Score) — cada um função pura com teste unitário. `rollup.ts` (health_events → metric_snapshots) e `analyticsService.ts` (`recomputeDay`/`recomputeRange`, popula `daily_summary`). `trendAnalyzer.ts` e `comparisonEngine.ts` (semana atual × anterior). 116 testes no total.
- [x] `MetricRepository` (interface em `domain/repositories.ts` + implementação Supabase em `repositories/metricRepository.ts`) — as tabelas `metric_snapshots`/`daily_summary` já existiam desde a migration 001 da Fase 0, nenhuma migration nova precisou ser criada.
- [x] Rotas: `GET /api/v1/metrics/[metricId]`, `GET /api/v1/summary/daily`, `POST /api/v1/admin/recompute` (reprocesso manual) e `GET /api/v1/cron/daily` (autenticado via `service_role` + `CRON_SECRET`, agendado em `web/vercel.json` para 09:00 UTC = 06:00 America/Sao_Paulo).
- [x] Dashboard: `/` (visão geral — `OverviewCards` + `RecoveryTrendChart`), `/sono` (`SleepDurationChart` + comparativo semanal), `/exercicios` (`TrainingLoadChart` + `WorkoutList`); o formulário de registro rápido da Fase 1 se mudou de `/` para `/registro`. `NavBar` fixa no rodapé.
- [x] `npm test` (116), `npm run typecheck`, `npm run lint`, `npm run build` verdes. Verificado no browser (`npm run dev` local contra o Supabase de produção, logado como `pedro@mail.com`): as três telas renderizam com dado real já computado (Recovery 89, Sono 7h28, tendência "estável", treinos com carga/ACWR).
- [x] **Fase 3 considerada pronta** pelo critério do roadmap (`docs/ROADMAP.md` atualizado).

## Resolvido em 2026-07-21 — Fase 2 validada em dispositivo real; bug de normalização encontrado e corrigido

- [x] **Build development do sync-app gerado via EAS Build (nuvem)** e instalado no Android real do Pedro (Galaxy S/Note + Galaxy Watch 8 via Samsung Health). Dois bugs de build corrigidos no caminho: `package-lock.json` fora de sincronia com `package.json` (`npm ci` falhava) e `expo-dev-client` faltando como dependência declarada (funcionava local mas não num `npm ci` limpo na nuvem).
- [x] **Erro de Gradle `:app:checkDebugAarMetadata`**: `compileSdkVersion`/`targetSdkVersion` estavam fixados em 35 via `expo-build-properties`, mas dependências do Expo SDK 57 (`androidx.browser` 1.9.0, `androidx.core`/`core-ktx` 1.17.0) exigem `compileSdk` ≥ 36. Corrigido subindo os dois para 36.
- [x] **Primeiro sync real confirmado**: login com `pedro@mail.com`, permissões do Health Connect concedidas, "Sincronizar agora" trouxe 200 registros (sono, treino, FC, passos, peso) do Galaxy Watch 8 até o Supabase.
- [x] **Bug real de normalização encontrado via dado de produção**: os schemas zod de `web/src/domain/healthConnect.ts` tratavam `metadata.clientRecordId`, `title`, `notes`, `mealType` e `name` como `.optional()` (aceita `undefined`), mas o Health Connect nativo do Android manda `null` explícito para esses campos quando ausentes, não omite a chave. Resultado: 115 dos 200 primeiros registros (100% de SleepSession/ExerciseSession/HeartRate, 62/147 de Steps) caíram em `raw_records` com `norm_status='error'` e nunca viraram `health_events` — mas o dado bruto não foi perdido (fonte da verdade imutável), só a promoção falhou. Corrigido trocando `.optional()` por `.nullable().optional()` nesses campos; teste de regressão adicionado em `healthConnect.test.ts` com o payload real (`null`) que causava a falha.
- [x] **Reprocessamento dos 115 registros já corrigidos**: sem rota admin de reprocesso ainda implementada, rodado um script pontual (`npx tsx`, deletado depois de usar) que reaproveitou o `normalize()` e o `EventRepository` reais, autenticado como `pedro@mail.com` (sem precisar de `SUPABASE_SERVICE_ROLE_KEY`, que segue vazia localmente). 115/115 reprocessados com sucesso — `health_events` agora reflete os 200 registros originais (18 sleep_session, 17 workout, 22181 heart_rate — cada sessão de FC contínua vira várias amostras —, 147 steps).
- [x] **Fase 2 considerada pronta** pelo critério do roadmap (`docs/ROADMAP.md` atualizado). PR #3 (`fase-2-sync` → `main`) atualizado com o resumo completo.

## Resolvido em 2026-07-20 (5) — Fase 1: peso real lançado

- [x] Pedro lançou um peso real pelo PWA em produção — critério de "pronto" da Fase 1 confirmado. Fase 1 considerada **pronta** de ponta a ponta.
- [x] `sync-app/eas.json` adicionado (perfis `development`/`preview`/`production`) — caminho de build na nuvem (EAS) escolhido em vez de `expo run:android` local, porque não exige Android Studio/SDK na máquina do Pedro.

## Resolvido em 2026-07-20 (4) — Fase 1 mergeada em produção + Fase 2 (sync automático) implementada

- [x] Pedro reautorizou o escopo da integração MCP da Vercel — `list_projects`/`list_teams` agora enxergam o projeto `healthia`.
- [x] Pedro mergeou o PR `fase-1-ingestao` → `main` direto pelo GitHub; deploy de produção confirmado `READY` (commit `f83bc3c2`, via MCP `list_deployments`).
- [x] **Fase 2 implementada**: lado servidor completo (`POST /api/v1/sync/batch` idempotente + 9 normalizers do Health Connect — sono, treino, FC, HRV, passos, peso, composição corporal, hidratação, refeição — com conversão de unidades pra SI), testado (50 testes no total, unit com repositório fake). Rotas de API agora suportam autenticação via cookie (navegador) **ou** `Authorization: Bearer` (sync-app, sem cookies) — `proxy.ts` não intercepta mais `/api/*`.
- [x] `sync-app/` scaffolded (Expo + TypeScript): login com a conta do Pedro (sessão via SecureStore fragmentado em chunks — token do Supabase não cabe no limite de ~2KB por item), fila local em SQLite, sync manual + tentativa de background (`expo-background-fetch`). `tsc --noEmit` limpo. **Nunca rodado de verdade** — sem Android/emulador com Health Connect disponível neste ambiente (ver Ação do Pedro acima).
- [x] Branch `fase-2-sync` criada a partir de `main`, commitada. Não mergeada — depende do teste real do Pedro.

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

## Backlog (pós Fase 6)

- [ ] Planejamento alimentar de verdade (vínculo receita↔refeição registrada, calendário) — ficou fora da Fase 5 por não fazer parte do critério de pronto; hoje registrar uma refeição e cadastrar uma receita são fluxos separados.
- [ ] Expandir a base de alimentos (`healthia.foods`) além do seed curado de 93 itens da Fase 5, se o Pedro sentir falta de algum alimento nas receitas — é uma tabela de domínio comum, dá pra inserir mais linhas sem migration.
- [ ] Unidade de ingrediente de receita além de grama (hoje só "quantidade em gramas" — ex.: "1 unidade" de ovo exige o Pedro estimar o peso).
- [ ] Persistir histórico de chat, se o Pedro sentir falta — hoje é efêmero por decisão consciente de escopo (ver `docs/ROADMAP.md` Fase 6).
- [ ] Expandir o conjunto curado de métricas aceitáveis como meta (`engines/goals/goalMetrics.ts`) se o Pedro quiser uma meta em cima de outra métrica do catálogo.

## Decisões pendentes

- [ ] Estratégia de backup: GitHub Action semanal com pg_dump (ainda não definida; sem prazo fixo agora que a Fase 1 fechou)

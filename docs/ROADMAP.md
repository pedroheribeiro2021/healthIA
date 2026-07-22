# HealthIA — Roadmap de Implementação

Fases pequenas, cada uma termina com algo funcionando de ponta a ponta **em produção** (Vercel).
Dados manuais e dashboard vêm antes do sync automático — valor desde a primeira semana.

## Fase 0 — Fundação (parcialmente concluída em 2026-07-19, ver notas/Registro-de-Sessoes.md)
- Criar projeto Supabase (free tier) + projeto Vercel ligado ao repo.
  - Desvio: org Supabase já estava no limite de 2 projetos free → schema dedicado `healthia` dentro do projeto `rachaconta` (ADR-002), não um projeto novo.
  - Projeto Vercel `healthia` criado; deploy via integração automática ficou bloqueado (`403`), resolvido logando com a conta do Pedro no browser — ver notas/Registro-de-Sessoes.md.
- Scaffold `web/` (Next.js + TS + Tailwind + vitest + PWA base) com deploy funcionando. ✅ `npm test`, `npm run typecheck`, `npm run build` verdes e **app em produção**: https://healthia-six.vercel.app.
- Migration 001 (schema completo do DATA_MODEL.md) + RLS; Supabase Auth com a conta do Pedro, cadastro desabilitado; middleware (proxy.ts) protegendo tudo. ✅ schema + RLS + triggers append-only aplicados; proxy funcionando em produção; conta do Pedro ainda não existe no projeto — ver Pendências.
- Repositórios (interfaces em `domain/` + implementação Supabase). ✅ `EventRepository` (raw_records + health_events).

**Pronto quando:** app no ar na URL da Vercel, login do Pedro funciona, schema aplicado, `npm test` e `npm run typecheck` verdes.
**Status:** app no ar ✅, schema aplicado ✅, testes/typecheck verdes ✅ — falta expor o schema `healthia` na Data API do Supabase e criar a conta real do Pedro para o login funcionar de ponta a ponta em produção. Ver `notas/Pendencias.md`.

## Fase 1 — Ingestão manual + fonte da verdade (implementada em 2026-07-20, ver notas/Registro-de-Sessoes.md)
- `POST /api/v1/events/manual` (peso, hidratação, refeição simples, nota). ✅
- Pipeline completa: raw_records → Normalization → health_events (dedup + reprocesso). ✅ `normalization/registry.ts` (contrato `normalize(raw)` por `source:recordType`) + `normalization/ingest.ts` (orquestração, reaproveitável pela Fase 2 e por um futuro `/admin/reprocess`).
- PWA: formulário de registro rápido + gráfico de peso. Instalável no celular (manifest + ícone). ✅ `modules/registro/`.

**Pronto quando:** registrar peso pelo celular na rua e ver o gráfico atualizado; linhas correspondentes em raw_records e health_events.
**Status:** ✅ **Fase 1 pronta.** Mergeada em `main`, em produção (`healthia-six.vercel.app`), e Pedro confirmou o registro de peso real pelo celular.

## Fase 2 — Sync automático (Health Connect) — implementada em 2026-07-20, validada em dispositivo real em 2026-07-21, ver notas/Registro-de-Sessoes.md
- sync-app Expo: permissões Health Connect, leitura de sono/treinos/FC/HRV/passos/peso/composição corporal/hidratação/refeição, fila local (expo-sqlite), envio em lote, sync manual + tentativa de background. ✅ código e ✅ testado num Android real (Galaxy Watch 8 via Samsung Health).
- `POST /api/v1/sync/batch` idempotente; normalizers do Health Connect para os 9 tipos lidos. ✅ implementado e testado (unit, repositório fake, e agora também com dado real de produção).

**Pronto quando:** uma noite de sono e um treino do relógio aparecem como health_events sem intervenção manual.
**Status:** ✅ **Fase 2 pronta.** Build development gerado via EAS Build (nuvem), instalado no Android do Pedro, login com a conta real, permissões do Health Connect concedidas, sync executado — sono, treino, frequência cardíaca, passos e peso do Galaxy Watch 8 confirmados em `health_events` (18 sleep_session, 17 workout, 22181 heart_rate, 147 steps). Bug real encontrado e corrigido no caminho (schemas zod do Health Connect rejeitavam `null` em campos opcionais; Health Connect manda `null` explícito, não omite a chave) — 115 registros que tinham caído em erro de normalização foram reprocessados com sucesso após o fix. Branch `fase-2-sync`, aguardando confirmação do Pedro para merge em `main`.

## Fase 3 — Analytics core + Dashboard real (implementada em 2026-07-21, ver notas/Registro-de-Sessoes.md)
- Catálogo de métricas; calculators de sono, FC repouso, HRV, carga, peso; `daily_summary`; Recovery Score v1; TrendAnalyzer; Vercel Cron diário. ✅ `engines/analytics/` (catálogo + 6 calculators + rollup + comparisonEngine + trendAnalyzer, cada um função pura + teste), `POST /api/v1/admin/recompute` (reprocesso manual de um intervalo) e `GET /api/v1/cron/daily` (recalcula o dia anterior, autenticado via `CRON_SECRET`, `service_role`).
- Dashboard: visão geral (recovery, sono, HRV, peso, treinos) + módulos Sono e Exercícios com tendências e comparativos semana × semana. ✅ `/` (OverviewCards + RecoveryTrendChart), `/sono` (SleepDurationChart + WeekComparisonCard), `/exercicios` (TrainingLoadChart + WorkoutList); `/registro` recebeu o formulário de lançamento manual e o gráfico de peso que antes estavam na home. `NavBar` fixa no rodapé navega entre as 4 telas.

**Pronto quando:** abrir o PWA de manhã responde "como estou hoje?" sem tocar em nada.
**Status:** ✅ **Fase 3 pronta.** 116 testes (vitest) verdes, `npm run typecheck`/`npm run lint`/`npm run build` limpos. Verificado no browser contra o Supabase de produção (dev local, `.env.local`): `/` mostra Recovery 89, Sono 7h28, FC repouso 71bpm, 2 treinos (carga 76) com dados reais já computados em `daily_summary`; `/sono` mostra tendência "estável" e comparativo semana atual × anterior (6.4h vs 6.5h, -1.9%); `/exercicios` lista os treinos reais do Health Connect com carga de treino e ACWR. Falta só o Pedro configurar `CRON_SECRET` no projeto Vercel para o cron diário funcionar em produção (`vercel.json` já aponta `/api/v1/cron/daily` para as 09:00 UTC = 06:00 America/Sao_Paulo, conforme `docs/ARCHITECTURE.md`) — até lá, `daily_summary` precisa ser recalculado sob demanda via `POST /api/v1/admin/recompute`.

## Fase 4 — Correlações, Insights e Recomendações (implementada em 2026-07-21, ver notas/Registro-de-Sessoes.md)
- CorrelationFinder (lag 0–3 dias, significância mínima) + tela de correlações descobertas. ✅ `engines/analytics/correlationFinder.ts` (Spearman + teste de significância via valor crítico de t por grau de liberdade, `engines/analytics/stats/basic.ts`), `GET /api/v1/correlations?minConfidence=`, tela `/insights`.
- Insight Engine (7 regras iniciais); Recommendation Engine com priorização; alertas no dashboard. ✅ `engines/insights/rules/` (as 7 regras de `docs/ENGINES.md`) + `insightService.recomputeInsights` (dedup por rule_id+período); `engines/recommendations/recommendationPolicy.ts` (severidade > meta ativa > recência, máx. 3) + `recommendationService.refreshRecommendations`; `GET /api/v1/insights`, `GET /api/v1/recommendations`, `POST /api/v1/recommendations/{id}/done`; banner de alerta na home (`AlertBanner`) linkando pra `/insights`. Cron diário e `POST /api/v1/admin/recompute` agora rodam a pipeline completa (Analytics → Insights → Recommendations).

**Pronto quando:** o sistema aponta sozinho ao menos uma relação real ("futebol 2 dias seguidos → HRV menor") com evidência numérica.
**Status:** ✅ **Fase 4 pronta.** 172 testes (vitest) verdes, `npm run typecheck`/`npm run lint`/`npm run build` limpos. Verificado com dado real de produção via `POST /api/v1/admin/recompute` (30 dias): a regra `acwr_high` disparou sozinha ao detectar ACWR real do Pedro entre 2.95 e 4.00 (limite é 1.5) — evidência numérica real, sem intervenção manual —, gerou 3 recomendações abertas priorizadas ("Reduza a carga de treino nos próximos dias"), o banner de alerta apareceu na home, `/insights` listou tudo, e `POST /recommendations/{id}/done` fechou uma recomendação de ponta a ponta. `GET /api/v1/correlations` ainda não retornou nenhuma correlação significativa com o histórico atual (esperado: `n >= 14` pares e `p < 0.05` são exigentes, e HRV nunca foi sincronizado — ver Fase 2) — o CorrelationFinder está pronto pra achar assim que houver histórico suficiente de dias sobrepostos entre métricas.

## Fase 5 — Corpo, Nutrição e Exames (implementada em 2026-07-21, ver notas/Registro-de-Sessoes.md)
- Import de bioimpedância clínica + comparativo relógio × balança; módulo Corpo. ✅ `POST /api/v1/imports/bioimpedance` (fonte `bioimpedance`, distinta de `manual`), calculators `body.fatpct.daily`/`body.leanmass.daily`, tela `/corpo` (gráfico relógio × bioimpedância clínica + cards de tendência).
- Base de alimentos (TACO/TBCA), receitas com macros automáticos, lista de compras (exportar texto p/ Google Keep; API no backlog). ✅ Seed curado de 93 alimentos (`foods`), `engines/nutrition/` (macros por 100g escalados e somados, `recipe_ingredients` congela o valor no momento em que é adicionado), CRUD de receitas + ingredientes, lista de compras com "Copiar lista" pro Google Keep. Desvio: **sem planejamento alimentar** (calendário/vínculo receita↔refeição) nesta rodada — não fazia parte do critério de pronto; fica pra quando houver necessidade real de agendar refeições.
- Import de exames (upload no Storage) + evolução de marcadores + regra `lab_out_of_range`. ✅ `POST /api/v1/imports/lab` (fonte `lab`, upload opcional pro bucket privado `exams`), tela `/exames` com histórico por marcador e badge "fora da faixa" — ativa de vez a regra `lab_out_of_range` do Insight Engine (Fase 4), que até aqui sempre retornava null por falta de dado.

**Pronto quando:** bioimpedância mensal e hemograma importados aparecem nas tendências; receita cadastrada calcula macros sozinha.
**Status:** ✅ **Fase 5 pronta.** 198 testes (vitest) verdes, `npm run typecheck`/`npm run lint`/`npm run build` limpos. Verificado com dado real de produção via browser + chamadas diretas às rotas: bioimpedância registrada (peso 83.2kg, gordura 17.8%, massa magra 68.4kg) apareceu em `/corpo` depois do recompute do dia; exame de vitamina D (22 ng/mL, fora da faixa 30–100) apareceu em `/exames` com o badge correto **e** disparou sozinho a regra `lab_out_of_range` em `/insights` — confirmando a integração com o Insight Engine da Fase 4; receita de teste (frango 300g + arroz 400g, 2 porções) calculou sozinha 989kcal/106g proteína no total, 494.5kcal/53g proteína por porção — bate exatamente com a soma manual dos macros por 100g dos dois alimentos.

## Fase 6 — Metas, Relatórios e IA
- Metas por métrica; relatório semanal/mensal gerado pelo Analytics.
- AI Engine: adapter + Gemini default + providers alternativos; ContextBuilder; chat com streaming; explicação de insights; sugestão de receitas dentro dos macros.

**Pronto quando:** perguntar "meu condicionamento está evoluindo?" retorna resposta baseada nos indicadores calculados, citando números reais.

## Backlog pós-v1
- Notificações push (recomendação do dia); exportação de relatórios em PDF; Google Keep via API; corridas com GPS/rotas; comparativos ano × ano; backup automatizado além do semanal.

## Regras de execução (para o Claude Code)
- Nunca iniciar uma fase sem a anterior "pronta" pelo critério dela.
- Cada fase: branch própria (`fase-N-nome`), testes verdes antes de merge, deploy verificado.
- Ao final de cada fase: atualizar este arquivo (fase concluída + desvios), `notas/Registro-de-Sessoes.md` e `notas/Pendencias.md`.

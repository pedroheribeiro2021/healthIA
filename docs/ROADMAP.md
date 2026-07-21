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

## Fase 4 — Correlações, Insights e Recomendações
- CorrelationFinder (lag 0–3 dias, significância mínima) + tela de correlações descobertas.
- Insight Engine (7 regras iniciais); Recommendation Engine com priorização; alertas no dashboard.

**Pronto quando:** o sistema aponta sozinho ao menos uma relação real ("futebol 2 dias seguidos → HRV menor") com evidência numérica.

## Fase 5 — Corpo, Nutrição e Exames
- Import de bioimpedância clínica + comparativo relógio × balança; módulo Corpo.
- Base de alimentos (TACO/TBCA), receitas com macros automáticos, planejamento alimentar, lista de compras (exportar texto p/ Google Keep; API no backlog).
- Import de exames (upload no Storage) + evolução de marcadores + regra `lab_out_of_range`.

**Pronto quando:** bioimpedância mensal e hemograma importados aparecem nas tendências; receita cadastrada calcula macros sozinha.

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

# HealthIA — Roadmap de Implementação

Fases pequenas, cada uma termina com algo funcionando de ponta a ponta **em produção** (Vercel).
Dados manuais e dashboard vêm antes do sync automático — valor desde a primeira semana.

## Fase 0 — Fundação
- Criar projeto Supabase (free tier) + projeto Vercel ligado ao repo.
- Scaffold `web/` (Next.js + TS + Tailwind + vitest + PWA base) com deploy funcionando.
- Migration 001 (schema completo do DATA_MODEL.md) + RLS; Supabase Auth com a conta do Pedro, cadastro desabilitado; middleware protegendo tudo.
- Repositórios (interfaces em `domain/` + implementação Supabase).

**Pronto quando:** app no ar na URL da Vercel, login do Pedro funciona, schema aplicado, `npm test` e `npm run typecheck` verdes.

## Fase 1 — Ingestão manual + fonte da verdade
- `POST /api/v1/events/manual` (peso, hidratação, refeição simples, nota).
- Pipeline completa: raw_records → Normalization → health_events (dedup + reprocesso).
- PWA: formulário de registro rápido + gráfico de peso. Instalável no celular (manifest + ícone).

**Pronto quando:** registrar peso pelo celular na rua e ver o gráfico atualizado; linhas correspondentes em raw_records e health_events.

## Fase 2 — Sync automático (Health Connect)
- sync-app Expo: permissões Health Connect, leitura de sono/treinos/FC/HRV/passos/peso, fila local, envio em lote, sync incremental + background.
- `POST /api/v1/sync/batch` idempotente; normalizers do Health Connect para todos os tipos lidos.

**Pronto quando:** uma noite de sono e um treino do relógio aparecem como health_events sem intervenção manual.

## Fase 3 — Analytics core + Dashboard real
- Catálogo de métricas; calculators de sono, FC repouso, HRV, carga, peso; `daily_summary`; Recovery Score v1; TrendAnalyzer; Vercel Cron diário.
- Dashboard: visão geral (recovery, sono, HRV, peso, treinos) + módulos Sono e Exercícios com tendências e comparativos semana × semana.

**Pronto quando:** abrir o PWA de manhã responde "como estou hoje?" sem tocar em nada.

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

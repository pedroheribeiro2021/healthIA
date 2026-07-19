# HealthAI — Roadmap de Implementação

Fases pequenas, cada uma termina com algo funcionando de ponta a ponta.
Ordem pensada para gerar valor cedo: dados manuais e dashboard vêm antes do sync automático.

## Fase 0 — Fundação ✅ concluída (2026-07-19)
- Monorepo com `server/`, `dashboard/`, `sync-app/` (sync-app só scaffold).
- FastAPI de pé com healthcheck; migrations runner + migration 001 (todas as tabelas do DATA_MODEL.md).
- Repositórios com interface `Protocol` + implementação SQLite; pytest e ruff configurados; CI local simples.

**Pronto quando:** `uv run pytest` verde; `GET /health` responde; banco criado com schema completo.

**Entregue:** `server/` com FastAPI (`app/main.py`, lifespan roda migrations), migration 001 com schema completo do DATA_MODEL.md (inclui triggers de append-only em `raw_records`/`health_events`), `EventRepository` (`Protocol` em `domain/` + implementação SQLite), 7 testes pytest verdes, ruff limpo. `dashboard/` scaffold Vite+React+TS buildando. `sync-app/` scaffold Expo (blank-typescript) com `App.tsx` em `src/`, typecheck limpo. `scripts/ci.sh` roda lint+testes+build dos três apps localmente ("CI local simples" — sem GitHub Actions, coerente com offline first).

## Fase 1 — Ingestão manual + fonte da verdade
- `POST /api/v1/events/manual` (peso, hidratação, refeição simples, nota).
- Pipeline completa: raw_records → Normalization Engine → health_events (com dedup e reprocesso).
- Dashboard mínimo: formulário de registro manual + lista/gráfico de peso.

**Pronto quando:** registrar peso pelo navegador e vê-lo num gráfico, com linha correspondente em raw_records e health_events.

## Fase 2 — Sync automático (Health Connect)
- sync-app Expo: permissões Health Connect, leitura de sono/treinos/FC/HRV/passos/peso, fila local, envio em lote, sync incremental.
- `POST /api/v1/sync/batch` idempotente; normalizers do Health Connect para todos os tipos lidos.

**Pronto quando:** uma noite de sono e um treino registrados no relógio aparecem como health_events sem intervenção manual (além de abrir o app).

## Fase 3 — Analytics core + Dashboard real
- Catálogo de métricas; calculators de sono, FC repouso, HRV, carga de treino, peso; daily_summary; Recovery Score v1; TrendAnalyzer; job diário de recálculo.
- Dashboard: visão geral (recovery, sono, HRV, peso, treinos) + módulos Sono e Exercícios com tendências e comparativos semana × semana.

**Pronto quando:** abrir o dashboard de manhã responde "como estou hoje?" sem tocar em nada.

## Fase 4 — Correlações, Insights e Recomendações
- CorrelationFinder (defasagem 0–3 dias, significância mínima) + tela de correlações descobertas.
- Insight Engine com as 7 regras iniciais; Recommendation Engine com priorização; alertas no dashboard.

**Pronto quando:** o sistema aponta sozinho ao menos uma relação real do tipo "futebol 2 dias seguidos → HRV menor" com evidência numérica.

## Fase 5 — Corpo, Nutrição e Exames
- Import de bioimpedância clínica + comparativo relógio × balança; módulo Corpo com tendências de composição.
- Base de alimentos (TACO/TBCA), receitas com macros automáticos, planejamento alimentar, lista de compras (exportação Google Keep: gerar texto copiável primeiro; API depois, se viável).
- Import de exames laboratoriais + evolução de marcadores + regra `lab_out_of_range`.

**Pronto quando:** uma bioimpedância mensal e um hemograma importados aparecem nas tendências; uma receita cadastrada calcula macros sozinha.

## Fase 6 — Metas, Relatórios e IA
- Metas por métrica com acompanhamento; relatório semanal/mensal gerado pelo Analytics.
- AI Engine: adapter + Ollama default + providers remotos; ContextBuilder; chat com streaming; explicação de insights; sugestão de receitas dentro dos macros.

**Pronto quando:** perguntar "meu condicionamento está evoluindo?" retorna resposta baseada nos indicadores calculados, citando números reais.

## Backlog pós-v1
- mDNS para descoberta do servidor; backup automático agendado; exportação de relatórios em PDF; PostgreSQL opcional; corridas com GPS/rotas; comparativos ano × ano; integração Google Keep via API.

## Regras de execução (para o Claude Code)
- Nunca iniciar uma fase sem a anterior "pronta" pelo critério dela.
- Cada fase: branch própria, testes verdes antes de merge.
- Ao final de cada fase, atualizar este arquivo marcando a fase como concluída e registrando desvios de escopo.

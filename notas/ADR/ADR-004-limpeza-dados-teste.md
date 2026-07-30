# ADR-004 — Limpeza pontual de dado de teste em produção (exceção ao append-only)

**Status:** proposto (aguardando execução pelo Pedro via Supabase SQL Editor, role `owner`)
**Data:** 2026-07-30

## Contexto

O diagnóstico da Fase 7 (Etapa 0, `docs/FASE-7-ROTINA.md`) encontrou dado de teste em produção, criado durante a validação das Fases 5 e registrado em `notas/Registro-de-Sessoes.md`:

- `health_events` id **22365** — `body_composition` fictícia, 83,2 kg, fonte `bioimpedance`, usada pra validar a tela `/corpo` na Fase 5.
- `health_events` id **22366** — `lab_result` de vitamina D (22 ng/mL), usado pra validar a regra `lab_out_of_range` na Fase 4/5.
- `raw_records` correspondentes a esses dois eventos.
- Uma receita de teste (frango 300 g + arroz 400 g, 2 porções) e seus `recipe_ingredients`, criada pra validar cálculo de macros na Fase 5.
- Itens de `shopping_list_items` criados no mesmo teste.
- `insights`/`recommendations` derivados de `lab_out_of_range`, gerados a partir do exame de teste.

`health_events` e `raw_records` são append-only por princípio (`docs/DATA_MODEL.md`) — nenhuma policy de `DELETE` existe para `authenticated`, de propósito. Essa limpeza é uma **exceção consciente e única**: remoção de dado que nunca foi real, não correção de dado real.

## Decisão

Remover os registros de teste listados acima via SQL administrativo executado com a role `owner`/`postgres` no Supabase SQL Editor — **não** por uma rota de API nova. Nenhum endpoint de exclusão é criado; a exceção não vira capacidade permanente do sistema.

⚠️ **Manter** `health_events` id **1** (peso manual de 76,6 kg, 20/07/2026) — é dado real, foi o critério de pronto da Fase 1.

Após a remoção: `POST /api/v1/admin/recompute` no período afetado, para a camada derivada (`daily_summary`, `metric_snapshots`, insights, recommendations) refletir só dado real.

## Como executar

1. Rodar a Etapa 1 (SELECT) abaixo no SQL Editor do Supabase e conferir que as linhas batem com o esperado (mesmos ids, mesmos valores).
2. Se bater, rodar a Etapa 2 (DELETE), na ordem (filhos antes de pais, por causa das FKs).
3. Rodar `POST /api/v1/admin/recompute` cobrindo desde a data mais antiga afetada até hoje.

```sql
-- ===== Etapa 1 — SELECT de verificação (rodar antes, conferir visualmente) =====

select id, event_type, source, occurred_at, payload
from healthia.health_events
where id in (1, 22365, 22366)
order by id;

select id, health_event_id, source, record_type, received_at
from healthia.raw_records
where health_event_id in (22365, 22366);

select * from healthia.recipes;
select * from healthia.recipe_ingredients where recipe_id in (select id from healthia.recipes);
select * from healthia.shopping_list_items;

select id, rule_id, period_start, period_end, severity
from healthia.insights
where rule_id = 'lab_out_of_range';

select id, insight_id, status, created_at
from healthia.recommendations
where insight_id in (select id from healthia.insights where rule_id = 'lab_out_of_range');
```

```sql
-- ===== Etapa 2 — DELETE (só depois de conferir a Etapa 1) =====
-- Ajustar os "where" de recipes/recipe_ingredients/shopping_list_items para os ids
-- reais retornados na Etapa 1 antes de rodar — os ids abaixo são placeholders.

begin;

delete from healthia.recommendations
where insight_id in (select id from healthia.insights where rule_id = 'lab_out_of_range');

delete from healthia.insights
where rule_id = 'lab_out_of_range';

delete from healthia.recipe_ingredients
where recipe_id in (select id from healthia.recipes where name ilike '%teste%' /* ajustar */);

delete from healthia.recipes
where name ilike '%teste%'; -- ajustar pelo id exato retornado na Etapa 1

delete from healthia.shopping_list_items; -- ajustar pelo id exato retornado na Etapa 1

delete from healthia.raw_records
where health_event_id in (22365, 22366);

delete from healthia.health_events
where id in (22365, 22366);

commit;
```

## Consequências

- `health_events`/`raw_records` seguem append-only para todo o resto do sistema; nenhuma policy de `DELETE` é concedida a `authenticated`.
- A remoção fica registrada aqui (ids exatos, motivo, data) em vez de só na conversa.
- `/corpo` volta a mostrar só bioimpedância real depois da Etapa 0.4 (import das 6 medições reais).

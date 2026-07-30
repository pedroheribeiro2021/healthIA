-- Fase 7, Etapa 1.2 (docs/FASE-7-ROTINA.md) — seed dos 9 hábitos e das 4
-- metas de docs/PLANO-SAUDE.md §3/§4. Seed via migration (não script
-- solto): é dado de configuração inicial, versionado, reproduzível.

insert into healthia.habits
  (slug, name, category, kind, unit, target_per_day, target_per_week, source_kind, priority, sort_order)
values
  ('agua', 'Água', 'hidratacao', 'quantity', 'l', 3.0, 7, 'derived', 'core', 10),
  ('creatina', 'Creatina 5 g', 'suplementacao', 'boolean', null, null, 7, 'manual_log', 'core', 20),
  ('fruta', 'Ao menos 1 fruta', 'nutricao', 'boolean', null, null, 7, 'manual_log', 'core', 30),
  ('sem_ifood', 'Sem iFood', 'nutricao', 'boolean', null, null, 6, 'manual_log', 'core', 40),
  ('dormir_cedo', 'Dormir antes das 23h', 'sono', 'boolean', null, null, 7, 'derived', 'core', 50),
  ('proteina_refeicoes', 'Proteína em todas as refeições', 'nutricao', 'boolean', null, null, 7, 'manual_log', 'core', 60),
  ('musculacao', 'Musculação', 'treino', 'boolean', null, null, 4, 'derived', 'core', 70),
  ('escadas', 'Escadas (+1 ao 6º andar)', 'treino', 'quantity', 'subidas', 5, 3, 'manual_log', 'core', 80),
  ('cardio', 'Cardio pós-treino', 'treino', 'boolean', null, null, 2, 'manual_log', 'bonus', 90);

insert into healthia.goals (metric_id, target_value, direction)
values
  ('body.weight.avg7d', 73.5, 'decrease'),
  ('body.fatpct.avg7d', 17.5, 'decrease'),
  ('habit.adherence.avg7d', 85, 'increase'),
  ('training.sessions.7d', 4, 'increase');

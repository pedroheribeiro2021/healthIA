-- CORRECOES-F1.md, item 1c (ver notas/Pendencias.md e
-- notas/auditoria/INVENTARIO.md): a migration 009 semeou 4 metas junto com
-- os hábitos, mas meta é decisão do usuário, não configuração do produto —
-- hábito é estrutura, meta é intenção pessoal. Regra nova: seed cria
-- hábito, nunca meta.
--
-- Verificado por SELECT contra produção em 2026-09-11 antes deste DELETE
-- (checkpoint pedido pelo Pedro): as 4 linhas semeadas por 009
-- (body.weight.avg7d=73.5, body.fatpct.avg7d=17.5, habit.adherence.avg7d=85,
-- training.sessions.7d=4) seguem com os mesmos valores e o mesmo
-- created_at de lote do INSERT original — nenhuma foi editada desde então.
-- Filtra por esse timestamp de lote, não por id gerado (nunca hardcode id
-- de identity numa migration de dados) — importante porque
-- healthia.goals.id=1 (peso 75kg, Fase 6, já desativada em 2026-07-22, 8
-- dias antes do seed) tem o mesmo metric_id de uma das linhas seedadas
-- (body.weight.avg7d) e não deve ser afetada.
delete from healthia.goals
where metric_id in (
  'body.weight.avg7d',
  'body.fatpct.avg7d',
  'habit.adherence.avg7d',
  'training.sessions.7d'
)
and created_at = timestamptz '2026-07-30 18:08:15.130471+00';

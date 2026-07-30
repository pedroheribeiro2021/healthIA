# ADR-005 — `habit_logs` mutável por dia (exceção ao append-only)

**Status:** aceito
**Data:** 2026-07-30

## Contexto

Todo o resto do schema `healthia` é append-only por princípio (`docs/DATA_MODEL.md`): `health_events`/`raw_records` guardam **medição** — um dado que foi verdade num instante e não deixa de ter sido. A Fase 7 introduziu `habits`/`habit_logs` (migration 008) para registrar hábitos do plano do Pedro (`docs/PLANO-SAUDE.md`).

`habit_logs` guarda **adesão**, não medição: é a intenção declarada pelo próprio usuário ("marquei creatina hoje"), corrigível por natureza. Marcar um hábito por engano e desmarcar segundos depois não é "corrigir a história" — é digitação.

Um `habit_logs` append-only exigiria um evento novo a cada toque, e responder "marquei hoje?" viraria `order by ... limit 1` sobre um log de toques — ruído sem valor, e sem ganho real de auditabilidade (não há cenário em que reconstruir "todas as vezes que o usuário tocou o botão" importa mais do que saber o estado final do dia).

## Decisão

`habit_logs` tem `unique (habit_id, day)` e é **upsert por dia** (`POST /api/v1/habits/{slug}/log`), com `DELETE` permitido para desmarcar (`DELETE /api/v1/habits/{slug}/log`). É a única tabela do schema `healthia` com policy de `DELETE` concedida a `authenticated` (migration 008) — todas as outras seguem sem `DELETE`, reforçando que essa é uma exceção pontual, não um novo padrão.

## Consequências

- `habit_logs` **não é recalculável** a partir de outra fonte — é a própria fonte da verdade da adesão manual (diferente de `metric_snapshots`/`daily_summary`, que são deriváveis de `health_events`).
- A exceção vale **só** para `habit_logs`. Nada mais no schema perde a imutabilidade: `health_events`/`raw_records` seguem com os triggers de proteção da migration 001; nenhuma outra tabela ganhou `DELETE` nesta migration.
- Hábitos `source_kind='derived'` (musculação, água, dormir cedo) não escrevem em `habit_logs` — são lidos on-demand de `health_events` a cada request (`engines/habits/derivedHabits.ts`), então a mutabilidade de `habit_logs` não se aplica a eles; a rota de log rejeita `POST`/`DELETE` para esses hábitos com 409.

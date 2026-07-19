# Fluxo de trabalho — HealthIA

## Conventional Commits (obrigatório)

Formato: `tipo(escopo opcional): descrição no imperativo, minúscula, sem ponto final`

| Tipo | Uso |
|---|---|
| `feat` | nova funcionalidade |
| `fix` | correção de bug |
| `docs` | apenas documentação |
| `refactor` | mudança de código sem alterar comportamento |
| `test` | criação/ajuste de testes |
| `perf` | melhoria de performance |
| `build` | dependências, build, tooling |
| `ci` | pipelines/automação |
| `chore` | manutenção que não toca src nem testes |
| `style` | formatação, sem mudança de lógica |
| `revert` | reversão de commit |

Escopos do projeto: `server`, `dashboard`, `sync-app`, `analytics`, `insights`, `recommendations`, `ai`, `db`, `api`, `normalization`, `docs`.

Exemplos:

```
feat(analytics): implementa recovery score v1
fix(sync-app): corrige dedup de sessões de sono no reenvio
docs(roadmap): marca fase 0 como concluída
chore(db): adiciona migration 003 de metric_snapshots
```

Breaking change: `tipo(escopo)!: descrição` + rodapé `BREAKING CHANGE: ...`.

O hook `.githooks/commit-msg` valida o formato automaticamente (configurado via `git config core.hooksPath .githooks`).

## Branches

- `main` — sempre estável, testes verdes.
- Uma branch por fase do roadmap (`fase-0-fundacao`, `fase-1-ingestao`, ...) ou por feature (`feat/recovery-score`).
- Merge em `main` só com testes passando.

## Memória do projeto (`notas/`)

Convenção herdada do vault Claude-Memoria (ver CLAUDE.md):

- `notas/Registro-de-Sessoes.md` — atualizado ao **fim de cada sessão** de desenvolvimento: data, objetivo, alterações, decisões, pendências, próximos passos.
- `notas/Pendencias.md` — sempre atualizado; tarefa concluída sai daqui e entra no registro da sessão.
- `notas/ADR/` — toda decisão arquitetural nova vira ADR numerado (`ADR-001-titulo.md`). As decisões de fundação já estão em `docs/ARCHITECTURE.md`.

O que atravessa mais de um projeto vai para o vault do Obsidian (`Claude-Memoria`), não para cá.

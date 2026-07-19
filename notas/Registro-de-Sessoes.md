# Registro de Sessões — HealthIA

Atualizado ao fim de cada sessão de desenvolvimento (convenção do vault Claude-Memoria).

---

## 2026-07-19 — Fundação do projeto (Cowork)

**Objetivo:** definir arquitetura/stack e deixar o repositório pronto para o desenvolvimento com Claude Code.

**Realizado:**
- Decisão de arquitetura: servidor local (Python/FastAPI + SQLite) + dashboard web (React/TS) + sync-app Android (Expo + Health Connect). IA plugável com Ollama como default. Custo zero, offline first.
- Documentação completa criada: `CLAUDE.md`, `docs/ARCHITECTURE.md` (componentes, protocolo de sync, ADRs), `docs/DATA_MODEL.md` (schema SQL, raw_records + health_events append-only), `docs/ENGINES.md` (contratos, Recovery Score v1, 7 regras de insight), `docs/ROADMAP.md` (fases 0–6 com critérios de pronto).
- Repositório git inicializado com conventional commits (hook `commit-msg` validando) e `CONTRIBUTING.md`.
- Vault Obsidian atualizado (`Projetos/README.md`).

**Decisões:**
- Payload bruto do Health Connect é enviado ao servidor; normalização acontece no servidor (permite reprocessar histórico).
- SQLAlchemy Core (não ORM) + repositórios com Protocol → troca futura para PostgreSQL sem dor.
- Dados de saúde (`*.db`) nunca versionados no git.

**Pendências / próximos passos:** ver [Pendencias.md](Pendencias.md) — começar pela Fase 0 do roadmap.

---

## 2026-07-19 — Fase 0: Fundação do monorepo

**Objetivo:** executar a Fase 0 do roadmap — scaffold de `server/`, `dashboard/` e `sync-app/` com testes verdes.

**Realizado:**
- `server/`: projeto uv (Python 3.12+, FastAPI, Pydantic v2, SQLAlchemy Core). `app/main.py` com app factory + lifespan que roda as migrations no start. `GET /health`.
- Migration runner (`app/repositories/sqlite/migrations.py`, sqlite3 puro por causa dos triggers com `BEGIN..END`) + `migrations/001_initial.sql` com o schema completo do DATA_MODEL.md, incluindo triggers de proteção append-only em `raw_records` e `health_events` (bloqueiam DELETE e UPDATE fora dos campos permitidos).
- `EventRepository`: `Protocol` em `app/domain/repositories.py` + implementação `SqliteEventRepository`.
- 7 testes pytest (health check, migrations idempotentes/schema completo/triggers, repositório) — todos verdes. `ruff check`/`ruff format` limpos.
- `dashboard/`: scaffold Vite + React + TS (`npm create vite -- --template react-ts`), boilerplate padrão do template removido, build validado.
- `sync-app/`: scaffold Expo (`create-expo-app --template blank-typescript`), `App.tsx` movido para `src/App.tsx` (consistente com a estrutura documentada em CLAUDE.md), `LICENSE` do template removida, typecheck validado. Nota: o scaffold do Expo cria `.claude/settings.json` habilitando o plugin oficial `expo@claude-plugins-official` — mantido (é comportamento padrão da ferramenta, não intervenção manual).
- `scripts/ci.sh`: CI local simples (lint + testes + build dos três apps), item que estava no critério da Fase 0.
- Branch `fase-0-fundacao` criada para o trabalho, conforme convenção do CONTRIBUTING.md.

**Decisões:**
- Migration runner usa `sqlite3` da stdlib diretamente (não SQLAlchemy Core) para poder rodar `executescript` com triggers multi-statement; repositórios seguem usando SQLAlchemy Core, mantendo a portabilidade exigida pela arquitetura.
- Triggers de append-only ficam na migration (camada permitida a ter SQL específico de dialeto).
- "CI local simples" da Fase 0 interpretado como script de shell (`scripts/ci.sh`), não pipeline em nuvem — coerente com o princípio offline first; não há decisão de usar GitHub Actions.

**Pendências / próximos passos:** ver [Pendencias.md](Pendencias.md) — começar pela Fase 1 (ingestão manual + fonte da verdade).

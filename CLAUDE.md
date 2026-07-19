# HealthAI — Guia do Projeto (CLAUDE.md)

> Plataforma pessoal de inteligência em saúde. Transforma medições em decisões.
> Usuário único: Pedro. Sem multi-tenancy, sem cadastro de usuários.

## Pergunta que o sistema responde

> "O que devo fazer hoje para melhorar minha saúde amanhã?"

## Documentação

| Documento | Conteúdo |
|---|---|
| `docs/ARCHITECTURE.md` | Componentes, fluxo de dados, protocolo de sync, regras de desacoplamento |
| `docs/DATA_MODEL.md` | Modelo de dados unificado, schema SQL, dedup, fonte da verdade |
| `docs/ENGINES.md` | Contratos entre Analytics, Insight, Recommendation e AI Engine |
| `docs/ROADMAP.md` | Fases de implementação com critérios de pronto |
| `CONTRIBUTING.md` | Conventional commits, branches, memória do projeto |
| `notas/` | Registro de sessões, pendências e ADRs (atualizar toda sessão) |

Leia esses documentos antes de implementar qualquer módulo.

## Princípios inegociáveis

1. **Dados primeiro.** Toda decisão parte dos dados, nunca da IA.
2. **Analytics antes de IA.** Métricas, scores, tendências e correlações são calculados pelo Analytics Engine (código determinístico, testável). A IA **nunca** calcula indicadores — apenas explica resultados já processados.
3. **Offline first.** Tudo roda localmente. Internet só para o AI Engine (quando provider remoto) e nada mais.
4. **Desacoplamento.** Nenhum componente conhece tecnologia concreta de outro. Banco atrás de repositórios; IA atrás de adapter; fontes de dados atrás do Normalization Engine. Claude, OpenAI, Gemini, SQLite, PostgreSQL: todos substituíveis.
5. **Fonte da verdade imutável.** Eventos de saúde são append-only. Indicadores são deriváveis e recalculáveis a qualquer momento. Dado bruto nunca é perdido nem sobrescrito.
6. **Longo prazo.** Sem atalhos, sem soluções temporárias, sem acoplamento por conveniência.

## Stack

| Camada | Tecnologia | Observação |
|---|---|---|
| Backend + Engines | Python 3.12+, FastAPI, Pydantic v2 | Analytics com pandas/numpy/scipy/statsmodels |
| Banco | SQLite (WAL) via SQLAlchemy Core | Trocável por PostgreSQL — proibido SQL específico de dialeto fora da camada de repositório |
| Dashboard | React 18 + TypeScript + Vite | Servido como estático pelo FastAPI; gráficos com Recharts |
| App de sync (Android) | React Native + Expo, `react-native-health-connect` | Lê Health Connect (Samsung Health / Galaxy Watch 8) e envia ao servidor via Wi-Fi local |
| AI Engine | Adapter plugável | Providers: Ollama (default, local/grátis), Anthropic, OpenAI, Gemini |
| Testes | pytest (server), vitest (dashboard) | Analytics Engine exige testes unitários com dados sintéticos |

## Estrutura do monorepo

```
healthai/
├── CLAUDE.md
├── docs/
├── server/                  # Python — backend + engines
│   ├── app/
│   │   ├── main.py          # FastAPI app factory
│   │   ├── api/             # rotas REST (thin controllers, zero regra de negócio)
│   │   ├── domain/          # entidades e tipos do domínio (Pydantic)
│   │   ├── repositories/    # única camada que toca o banco
│   │   ├── normalization/   # conversores fonte → modelo interno
│   │   ├── engines/
│   │   │   ├── analytics/   # métricas, tendências, correlações, scores
│   │   │   ├── insights/    # indicadores → conclusões
│   │   │   ├── recommendations/  # insights → ações
│   │   │   └── ai/          # adapter de providers de IA
│   │   └── config.py
│   ├── migrations/          # SQL versionado
│   ├── tests/
│   └── pyproject.toml
├── dashboard/               # React + TS + Vite
│   └── src/
│       ├── modules/         # um diretório por módulo de domínio
│       ├── components/
│       └── api/             # client tipado da API
└── sync-app/                # Expo / React Native
    └── src/
```

## Comandos

```bash
# server
cd server && uv sync && uv run uvicorn app.main:app --reload   # dev
cd server && uv run pytest                                     # testes
cd server && uv run ruff check . && uv run ruff format .       # lint

# dashboard
cd dashboard && npm install && npm run dev
cd dashboard && npm run build    # gera estático servido pelo FastAPI
cd dashboard && npm test

# sync-app
cd sync-app && npm install && npx expo start
```

## Convenções

- Idioma: código e identificadores em **inglês**; comentários, docs e textos de UI em **português**.
- Unidades sempre no SI no banco (kg, m, s, ms, bpm, kcal); conversão só na UI.
- Timestamps em UTC (ISO 8601) no banco; timezone do usuário (`America/Sao_Paulo`) aplicado na apresentação e no corte de "dia".
- Nada de regra de negócio em `api/` nem em `repositories/`. Regra de negócio vive nos engines.
- Todo score/métrica novo: implementação pura (função sem I/O) + teste unitário antes de ligar na API.
- Commits pequenos e frequentes, **sempre no padrão Conventional Commits** (`tipo(escopo): descrição` — ver `CONTRIBUTING.md`; hook `commit-msg` valida). Migrations nunca editadas depois de aplicadas — sempre nova migration.
- **Fim de toda sessão de desenvolvimento**: atualizar `notas/Registro-de-Sessoes.md` (data, objetivo, alterações, decisões, próximos passos) e `notas/Pendencias.md`. Decisão arquitetural nova vira ADR em `notas/ADR/`.
- Conhecimento que atravessa outros projetos vai para o vault Obsidian `Claude-Memoria` (OneDrive\Documents\Claude-Memoria), não para este repo.

## Anti-padrões (rejeitar em qualquer PR)

- Chamar IA para calcular qualquer número.
- Import de SQLAlchemy/SQL fora de `repositories/` ou `migrations/`.
- Import de SDK de IA (anthropic, openai, etc.) fora de `engines/ai/providers/`.
- Apagar ou sobrescrever linhas de `health_events`.
- Lógica de negócio no dashboard (dashboard só apresenta o que a API entrega pronto).
- Dependência de serviço em nuvem para funcionamento básico.

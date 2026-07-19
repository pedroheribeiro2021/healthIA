# HealthIA — Guia do Projeto (CLAUDE.md)

> Plataforma pessoal de inteligência em saúde. Transforma medições em decisões.
> Usuário único: Pedro. Sem multi-tenancy — auth existe só para proteger os dados dele.

## Pergunta que o sistema responde

> "O que devo fazer hoje para melhorar minha saúde amanhã?"

## Documentação

| Documento | Conteúdo |
|---|---|
| `docs/ARCHITECTURE.md` | Componentes, fluxo de dados, sync, auth, regras de desacoplamento |
| `docs/DATA_MODEL.md` | Modelo de dados unificado, schema SQL (Postgres/Supabase), dedup |
| `docs/ENGINES.md` | Contratos entre Analytics, Insight, Recommendation e AI Engine |
| `docs/ROADMAP.md` | Fases de implementação com critérios de pronto |
| `CONTRIBUTING.md` | Conventional commits, branches, memória do projeto |
| `notas/` | Registro de sessões, pendências e ADRs (atualizar toda sessão) |

Leia esses documentos antes de implementar qualquer módulo. Decisões de arquitetura passadas: `notas/ADR/`.

## Princípios inegociáveis

1. **Dados primeiro.** Toda decisão parte dos dados, nunca da IA.
2. **Analytics antes de IA.** Métricas, scores, tendências e correlações são calculados pelo Analytics Engine (código determinístico, testável). A IA **nunca** calcula indicadores — apenas explica resultados já processados.
3. **Acessível em qualquer lugar, resiliente a offline.** PWA mobile-first sempre no ar (Vercel + Supabase, free tier). O sync-app tolera falta de rede com fila local; o web app funciona 100% sem IA configurada. (ADR-001: substituiu o princípio "offline first" da v1 local.)
4. **Desacoplamento.** Nenhum componente conhece tecnologia concreta de outro. Supabase atrás de repositórios; IA atrás de adapter; fontes de dados atrás do Normalization Engine. Claude, OpenAI, Gemini, Supabase, Postgres puro: todos substituíveis.
5. **Fonte da verdade imutável.** Eventos de saúde são append-only. Indicadores são deriváveis e recalculáveis a qualquer momento. Dado bruto nunca é perdido nem sobrescrito.
6. **Longo prazo.** Sem atalhos, sem soluções temporárias, sem acoplamento por conveniência.

## Stack

| Camada | Tecnologia | Observação |
|---|---|---|
| Web (dashboard + API + engines) | Next.js (App Router) + TypeScript + Tailwind, PWA | Deploy na Vercel (hobby). Mobile-first: 95% do uso é pelo celular |
| Banco + Auth + Storage | Supabase (Postgres, RLS, Auth) | Acesso **somente** via `repositories/`; migrations SQL versionadas |
| Analytics | TypeScript puro em `web/src/engines/analytics` | Funções puras + vitest; recálculo diário via Vercel Cron |
| App de sync (Android) | Expo + `react-native-health-connect` | Lê Health Connect (Samsung Health / Galaxy Watch 8), fila local, envia à API de qualquer rede |
| AI Engine | Adapter plugável | Providers: Gemini (default, free tier), Anthropic, OpenAI. Sistema funciona sem nenhum |
| Gráficos | Recharts | |
| Testes | vitest (web), testes de engines obrigatórios | Todo score/métrica: função pura + teste antes de ligar na API |

## Estrutura do monorepo

```
healthia/
├── CLAUDE.md
├── docs/
├── notas/                   # memória do projeto (sessões, pendências, ADRs)
├── web/                     # Next.js — dashboard + API + engines
│   ├── src/
│   │   ├── app/             # rotas App Router; app/api/ = REST (thin, zero regra de negócio)
│   │   ├── modules/         # UI por módulo de domínio (sono, corpo, nutrição, ...)
│   │   ├── components/
│   │   ├── domain/          # tipos e schemas (zod)
│   │   ├── repositories/    # única camada que toca Supabase
│   │   ├── normalization/   # conversores fonte → modelo interno
│   │   └── engines/
│   │       ├── analytics/   # métricas, tendências, correlações, scores
│   │       ├── insights/    # indicadores → conclusões
│   │       ├── recommendations/  # insights → ações
│   │       └── ai/          # adapter de providers (SDKs só em ai/providers/)
│   ├── supabase/
│   │   └── migrations/      # SQL versionado (supabase CLI)
│   └── package.json
└── sync-app/                # Expo / React Native
    └── src/
```

## Comandos

```bash
# web
cd web && npm install && npm run dev        # dev local (aponta pro Supabase)
cd web && npm test                          # vitest
cd web && npm run lint && npm run typecheck
npx supabase migration new <nome>           # nova migration
npx supabase db push                        # aplica migrations no projeto
git push                                    # deploy automático na Vercel

# sync-app
cd sync-app && npm install && npx expo start
```

## Convenções

- Idioma: código e identificadores em **inglês**; comentários, docs e textos de UI em **português**.
- Unidades sempre no SI no banco (kg, m, s, ms, bpm, kcal); conversão só na UI.
- Timestamps `timestamptz` em UTC; timezone do usuário (`America/Sao_Paulo`) aplicado na apresentação e no corte de "dia".
- Nada de regra de negócio em `app/api/` nem em `repositories/`. Regra de negócio vive nos engines.
- Componentes React só apresentam o que a API/engines entregam prontos. Nenhum indicador calculado no cliente.
- Todo score/métrica novo: implementação pura (função sem I/O) + teste unitário antes de ligar na API.
- Commits pequenos e frequentes, **sempre no padrão Conventional Commits** (`tipo(escopo): descrição` — ver `CONTRIBUTING.md`; hook `commit-msg` valida). Migrations nunca editadas depois de aplicadas — sempre nova migration.
- **Fim de toda sessão de desenvolvimento**: atualizar `notas/Registro-de-Sessoes.md` (data, objetivo, alterações, decisões, próximos passos) e `notas/Pendencias.md`. Decisão arquitetural nova vira ADR em `notas/ADR/`.
- Conhecimento que atravessa outros projetos vai para o vault Obsidian `Claude-Memoria` (OneDrive\Documents\Claude-Memoria), não para este repo.

## Anti-padrões (rejeitar em qualquer PR)

- Chamar IA para calcular qualquer número.
- Import de `@supabase/*` fora de `repositories/` (e do bootstrap de auth).
- Import de SDK de IA fora de `engines/ai/providers/`.
- Apagar ou sobrescrever linhas de `health_events` ou `raw_records`.
- Regra de negócio em componente React, rota de API ou repositório.
- Segredo/chave em código ou no repo (usar env da Vercel/Expo).
- `service_role` key exposta no cliente (só em rotas server-side).

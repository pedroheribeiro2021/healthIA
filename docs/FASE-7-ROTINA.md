# Fase 7 — Rotina, Hábitos e Navegação

> Especificação de implementação. Escrita antes de qualquer código, para o Claude Code executar.
> Conteúdo do plano do Pedro: [`PLANO-SAUDE.md`](PLANO-SAUDE.md). Convenções do projeto: [`../CLAUDE.md`](../CLAUDE.md).

---

## Por que esta fase existe

O app entregou seis fases e não é usado. O diagnóstico feito em 30/07/2026, com dado real de produção:

| Sintoma | Evidência |
|---|---|
| Sem dado novo há 8 dias | último `raw_records.received_at` = 22/07/2026 |
| Passos pararam em 10/07 | `steps` só existe entre 09/07 e 10/07 |
| Nenhuma meta cadastrada | `select count(*) from healthia.goals where active` = 0 |
| Dado de teste poluindo produção | bioimpedância de 83,2 kg (fictícia), exame de vitamina D de teste, 1 receita de teste |
| Bioimpedância real nunca importada | a de 23/07 (77,3 kg / 22,7 %) só existe no PDF |
| Fase 6 pronta mas invisível | branch `fase-6-metas-relatorios-ia` com metas, relatórios e chat, **nunca mergeada** |
| Navegação enterrando o app | 5 das 9 telas escondidas atrás de "Mais" |

Nada disso se resolve com mais feature. O que falta é: **o app não conhece a rotina do Pedro**. Ele sabe medir sono e treino vindos do relógio, mas não sabe que existe um plano com metas, hábitos e um checklist semanal.

Esta fase fecha essa lacuna e reorganiza a navegação em torno dela.

---

## Estado real do repositório (verificado em 30/07/2026)

**`main`** está na Fase 5 + um fix de navegação (`b16b780`).

**`origin/fase-6-metas-relatorios-ia`** tem 1 commit à frente, 56 arquivos, ~2.500 linhas, com a Fase 6 **completa e testada** (234 testes): tela `/metas` (criação, progresso, desativação), `/relatorios` (semanal/mensal), `/chat` (Gemini/Anthropic/OpenAI via REST, ADR-003), `engines/goals/`, `engines/reports/`, `engines/ai/`.

⚠️ **Conflito conhecido:** a `NavBar` da branch `fase-6` é a versão **antiga**, com 11 abas em rolagem horizontal. O commit `b16b780` em `main` corrigiu exatamente esse problema (reduziu para 4 abas + `/mais`). Mergear a Fase 6 sem cuidado **regride a navegação**. A Fase 7 reescreve a `NavBar` inteira de qualquer forma — mas o merge precisa acontecer com consciência disso, não por acidente.

---

## Ordem de execução

Três etapas, nesta ordem. Cada uma termina com verificação real antes da seguinte.

```
Etapa 0 — Diagnóstico e higiene dos dados   (bloqueante)
Etapa 1 — Hábitos, metas e check-in         (o coração da fase)
Etapa 2 — Navegação por rotina              (só depois que houver o que navegar)
```

---

# Etapa 0 — Diagnóstico e higiene dos dados

**Objetivo:** o app passa a ter só dado real e o Pedro sabe se pode contar com o sync automático ou não.

## 0.1 — Mergear a Fase 6

Abrir/retomar o PR de `fase-6-metas-relatorios-ia` → `main`. Antes de mergear, resolver o conflito da `NavBar` **mantendo a versão de `main`** (4 abas), não a da branch. A Fase 7 substitui esse arquivo depois; o que não pode acontecer é o merge reintroduzir a rolagem horizontal e o Pedro achar que o app regrediu.

Após o merge: `npm test`, `npm run typecheck`, `npm run lint`, `npm run build` verdes e deploy Ready na Vercel.

## 0.2 — Diagnosticar por que o sync parou

Esta é a pergunta a responder, não a feature a construir. Investigar nesta ordem, registrando o achado em `notas/Registro-de-Sessoes.md`:

1. **O dev client ainda está instalado no celular?** Builds de desenvolvimento do EAS expiram; o app pode simplesmente ter sumido ou parado de abrir.
2. **O background fetch alguma vez rodou sozinho?** `expo-background-fetch` no Android é *best-effort* — o sistema decide quando (ou se) executa, e agressivamente mata tarefas de apps que o usuário não abre. A hipótese mais provável é que **todo sync que aconteceu foi manual**, e o Pedro parou de abrir o app.
3. **A sessão do Supabase expirou?** O refresh token pode ter caducado sem que o app tratasse a renovação, fazendo todo envio falhar em silêncio.
4. **O Health Connect revogou permissões?** O Android revoga permissões de apps não usados por alguns meses.
5. **A fila local tem itens presos?** Consultar a tabela SQLite do `sync-app` — se houver itens enfileirados e não enviados, o problema é de envio, não de leitura.

**Não construir um sync novo nesta etapa.** O objetivo é um veredito escrito, com uma destas conclusões:

- *conserto barato* (ex.: reinstalar o dev client, tratar refresh de sessão) → consertar agora;
- *conserto caro* (ex.: precisa de build de produção, foreground service, WorkManager nativo) → registrar como fase própria e seguir. **O app precisa funcionar bem sem o relógio.**

Registrar o veredito em `notas/Pendencias.md` de qualquer forma.

## 0.3 — Limpar os dados de teste

Registros identificados como teste (verificados em 30/07/2026):

| Tabela | Registro | Ação |
|---|---|---|
| `health_events` | id **22365** — `body_composition` 83,2 kg, 22/07, source `bioimpedance` | remover |
| `health_events` | id **22366** — `lab_result` vitamina D 22 ng/mL, 15/07, source `lab` | remover |
| `raw_records` | as linhas de origem desses dois eventos | remover |
| `recipes` / `recipe_ingredients` | receita de teste (frango 300 g + arroz 400 g, 2 porções) | remover |
| `shopping_list_items` | itens criados no teste da Fase 5 | remover |
| `insights` / `recommendations` | tudo que derivar de `lab_out_of_range` | remover e recomputar |

⚠️ **Manter** o `health_events` id **1** — peso manual de 76,6 kg em 20/07. É **dado real** (foi o critério de pronto da Fase 1) e é coerente com o histórico do InBody.

**Como remover, respeitando o princípio de fonte da verdade imutável:** `health_events` e `raw_records` são append-only por design (`docs/DATA_MODEL.md`), sem policy de DELETE para `authenticated`. Esta limpeza é uma **exceção consciente e única** — remoção de dado que nunca foi real, não correção de dado real —, executada via SQL administrativo (MCP do Supabase, role owner), **não** por uma rota nova de API. Não criar endpoint de exclusão: a exceção não deve virar capacidade permanente do sistema.

Registrar a exceção em um ADR (`notas/ADR/ADR-004-limpeza-dados-teste.md`), com a lista exata de ids removidos.

Depois da limpeza: `POST /api/v1/admin/recompute` cobrindo todo o período, para a camada derivada refletir só dado real.

## 0.4 — Importar a bioimpedância real

As 6 medições de [`PLANO-SAUDE.md` §1](PLANO-SAUDE.md), de 26/02 a 23/07/2026.

O schema atual (`domain/bioimpedance.ts`) aceita `occurredAt`, `kg`, `bodyFatPct`, `leanMassKg`, `waterPct`, `bmrKcal`. O laudo InBody traz mais coisa que vale guardar — **estender o schema** com campos opcionais:

```ts
skeletalMuscleKg?: number   // massa muscular esquelética — o indicador que o plano quer preservar
fatMassKg?: number          // massa de gordura absoluta
visceralFatLevel?: number   // 1–20
bmi?: number
estimated?: boolean         // true quando o valor veio arredondado do gráfico histórico
```

Campos opcionais e aditivos: nenhum import existente quebra.

As 5 medições antigas entram com `estimated: true` (valores lidos do gráfico, arredondados pelo aparelho, `%` de gordura derivado). A de 23/07 entra com os valores exatos e `estimated: false`.

Import por chamadas a `POST /api/v1/imports/bioimpedance` (uma por medição) — a rota já existe, é idempotente por hash de payload, e usar o caminho real garante que a pipeline `raw_records → health_events` seja exercitada. Nada de INSERT direto.

**Pronto quando:** `/corpo` mostra a curva real de 5 meses e o `%` de gordura mais recente é 22,7 %, não 17,8 %.

---

# Etapa 1 — Hábitos, metas e check-in

**Objetivo:** o Pedro abre o app de manhã, vê o que tem pra fazer hoje, marca em 3 toques, e o app entende adesão como dado.

## 1.1 — Modelo de dados

### Decisão central: hábitos são entidade de 1ª classe

O modelo atual só sabe registrar **medição** (`health_events`: sono, peso, FC, treino). O plano do Pedro é feito de **adesão** — creatina, fruta, escadas, sem iFood. Isso não é medição e não cabe em `health_events` sem distorcer o modelo.

**Alternativa rejeitada:** registrar hábitos como `health_events` do tipo `note`. Vira texto livre invisível pro Analytics, sem streak, sem métrica de adesão, sem regra de insight. Seria um checklist bonito e um dado morto.

**Alternativa rejeitada:** checklist só na UI, sem persistência estruturada. Mostra o check de hoje e nada mais — nenhuma resposta pra "estou sendo consistente?", que é a pergunta que o plano faz.

### Migration 008

```sql
create table healthia.habits (
    id              bigint generated always as identity primary key,
    slug            text not null unique,          -- 'creatina', 'escadas', 'agua', ...
    name            text not null,
    category        text not null,                 -- 'treino' | 'nutricao' | 'hidratacao' | 'suplementacao' | 'sono'
    kind            text not null,                 -- 'boolean' | 'quantity'
    unit            text,                          -- 'l', 'subidas' — null quando boolean
    target_per_day  numeric,                       -- meta diária (kind='quantity')
    target_per_week numeric not null,              -- quantos dias por semana o hábito conta como cumprido
    source_kind     text not null default 'manual_log',  -- 'manual_log' | 'derived'
    priority        text not null default 'core',  -- 'core' | 'bonus'
    sort_order      int not null default 0,
    active          boolean not null default true,
    created_at      timestamptz not null default now()
);

create table healthia.habit_logs (
    id         bigint generated always as identity primary key,
    habit_id   bigint not null references healthia.habits(id),
    day        date not null,                      -- dia local America/Sao_Paulo
    done       boolean not null default true,
    quantity   numeric,                            -- preenchido quando kind='quantity'
    note       text,
    logged_at  timestamptz not null default now(),
    unique (habit_id, day)
);

create index idx_habit_logs_day on healthia.habit_logs (day);
```

RLS igual às demais tabelas de `healthia` (`is_authorized()`), mais os `GRANT` para `authenticated` — **incluindo `DELETE` em `habit_logs`**, diferente de todas as outras tabelas do schema. Ver justificativa abaixo. Lembrar do bug da Fase 0: RLS sem `GRANT` de schema/tabela dá `permission denied` antes de avaliar policy.

### `habit_logs` não é append-only — e isso é deliberado

Todo o resto do schema é append-only porque guarda **medição**: um dado que foi verdade num instante e não deixa de ter sido. Adesão é diferente — é **intenção declarada pelo próprio usuário**, corrigível. Marcar creatina por engano e desmarcar meio minuto depois não é "corrigir a história", é digitação.

Um checklist append-only exigiria um evento novo a cada toque, e a leitura de "marquei hoje?" viraria um `order by ... limit 1` sobre um log de toques. Ruído sem valor.

Por isso `habit_logs` tem `unique (habit_id, day)` e é **upsert por dia**, com `DELETE` permitido para desmarcar.

Registrar como **ADR-005 — habit_logs mutável por dia**, explicitando o limite: a exceção vale só para `habit_logs`; nada mais no schema perde a imutabilidade.

### Hábitos derivados

Três hábitos do plano já têm dado no sistema. Registrá-los de novo à mão seria pedir ao Pedro que digitasse o que o app já sabe:

| Hábito | Derivado de | Regra |
|---|---|---|
| `musculacao` | `health_events` tipo `workout` | existe ao menos 1 treino no dia |
| `agua` | `health_events` tipo `hydration` | soma do dia ≥ `target_per_day` |
| `dormir_cedo` | `health_events` tipo `sleep_session` | início do sono antes das 23h local |

Implementar em `engines/habits/derivedHabits.ts` como um **resolver explícito por slug** — um `switch`, não um motor genérico configurável por JSON. São três casos conhecidos; abstração aqui só adiciona superfície pra errar.

Hábito derivado é **somente leitura na UI**: aparece marcado, com a origem visível ("do relógio", "de 3,2 L registrados"). Se o dado da origem não existir no dia, aparece desmarcado e o Pedro pode registrar pelo caminho normal daquele dado (ex.: água por `POST /api/v1/events/manual`), não por `habit_logs`.

Consequência importante: enquanto o sync do relógio estiver parado (Etapa 0), `musculacao` vai ficar sempre desmarcado. Tratar isso na UI — se não há `workout` há mais de N dias, mostrar aviso de "sem dado do relógio" em vez de deixar o Pedro achar que não treinou.

## 1.2 — Seed dos hábitos e das metas

Migration 009, a partir de [`PLANO-SAUDE.md` §3 e §4](PLANO-SAUDE.md):

**Hábitos** — `agua` (quantity, 3 L, derivado), `creatina`, `fruta`, `sem_ifood` (6/7), `dormir_cedo` (derivado), `proteina_refeicoes`, `musculacao` (4/semana, derivado), `escadas` (quantity, 5 subidas, 3/semana), `cardio` (2/semana, `priority='bonus'`).

**Metas** em `goals`: peso 73,5 kg (`decrease`), gordura 17,5 % (`decrease`), adesão 85 % (`increase`), treinos 4/semana (`increase`).

As duas últimas exigem `metric_id` novos — ver 1.3.

Seed via migration (não script solto): é dado de configuração inicial, versionado, reproduzível.

## 1.3 — Analytics: adesão como métrica

Novos calculators em `engines/analytics/calculators/habits.ts`, funções puras com teste unitário, como todo o resto:

| `metric_id` | O que calcula |
|---|---|
| `habit.adherence.daily` | % dos hábitos `core` esperados hoje que foram cumpridos |
| `habit.adherence.avg7d` | média de 7 dias da anterior |

Ambos entram em `engines/analytics/catalog.ts` com `requiredEventTypes: []` (métrica composta: lê `habit_logs`, não `health_events`).

⚠️ **Restrição real do catálogo:** `catalog.test.ts` valida todo id contra `/^[a-z]+\.[a-z]+\.[a-z0-9]+$/` — exatamente três segmentos, sem underscore e sem dígito nos dois primeiros. Isso **proíbe** ids por hábito como `habit.sem_ifood.count.7d`. Foi o mesmo detalhe que fez a Fase 5 nomear `body.fatpct.daily` em vez de `body.fat_pct.daily`.

**Consequência de design:** streak e contagem semanal **por hábito** não viram `metric_snapshots`. Ficam em duas camadas:

- o breakdown do dia (quais hábitos foram cumpridos) vai em `metric_snapshots.detail` de `habit.adherence.daily`;
- streak e "quantas vezes nos últimos 7 dias" são calculados **on-demand** por funções puras em `engines/habits/habitStats.ts`, direto sobre `habit_logs`, e servidos por `GET /api/v1/habits/week`.

É a escolha certa por dois motivos além da regex: são consultas baratas (dezenas de linhas), e um `metric_id` por hábito faria a camada derivada crescer a cada hábito novo que o Pedro criasse.

Regras de cálculo, explícitas para não virar decisão implícita no código:

- Hábitos `priority='bonus'` (hoje só `cardio`) **não entram** no denominador da adesão. O plano os chama de "meta ideal"; penalizar por eles cria alarme falso.
- Hábitos com `target_per_week < 7` só contam no denominador do dia se ainda faltarem ocorrências para bater a meta da semana. Escadas 3x/semana já cumpridas na quarta não devem derrubar a adesão de quinta a domingo.
- Dia sem nenhum log e sem nenhum dado derivado: adesão `null`, não `0`. Ausência de registro não é ausência de comportamento — e um zero falso envenena média, tendência e correlação.

**Migrations aditivas em `daily_summary`:** `habit_adherence_pct` e `body_fat_pct` (esta última porque a meta de gordura precisa de valor atual, e `goalMetrics` da Fase 6 lê exclusivamente de `daily_summary`).

Popular ambas em `analyticsService.recomputeDay`.

## 1.4 — Metas: estender o catálogo da Fase 6

`engines/goals/goalMetrics.ts` cura hoje 6 `metric_id`. Adicionar:

| `metric_id` | Label | kind | extract |
|---|---|---|---|
| `habit.adherence.avg7d` | Adesão à rotina (média 7 dias) | `avg7d` | `s.habitAdherencePct` |
| `body.fatpct.avg7d` | Percentual de gordura (média 7 dias) | `avg7d` | `s.bodyFatPct` |
| `training.sessions.7d` | Treinos por semana | `sum7d` **(kind novo)** | `s.workouts` |

`sum7d` é um `GoalMetricKind` novo — soma em vez de média na janela de 7 dias. Único jeito honesto de expressar "4 treinos por semana" como meta.

Duas observações verificadas no código antes de escrever isto:

- `GOAL_METRIC_DEFS` é fonte independente do `METRIC_CATALOG` — a Fase 6 já usa `nutrition.protein.avg7d` sem entrada no catálogo, porque metas leem `daily_summary`, não `metric_snapshots`. Então as três entradas acima **não exigem** calculator novo no catálogo; exigem apenas que as colunas correspondentes de `daily_summary` estejam populadas.
- `body_fat_pct` em `daily_summary` deve ser populado a partir do calculator `body.fatpct.daily`, que **já existe** desde a Fase 5 — é só persistir o resultado numa coluna, não calcular nada novo.

## 1.5 — Regras de insight

Em `engines/insights/rules/`, mesmo padrão das 7 existentes (pura + teste):

| `rule_id` | Dispara quando | Severidade |
|---|---|---|
| `habit_adherence_drop` | adesão 7d < 60 %, ou queda ≥ 20 pp vs. semana anterior | `attention` |
| `habit_streak_broken` | hábito `core` com streak ≥ 7 quebrado | `info` |
| `stairs_below_target` | `escadas` < 3 ocorrências na semana fechada | `attention` |
| `weight_plateau_low_adherence` | peso sem tendência há ≥ 21 dias **e** adesão 7d < 70 % | `attention` |

A última é a que justifica o modelo inteiro: relaciona resultado (peso parado) com causa provável (adesão baixa) usando dois números reais — exatamente o tipo de conclusão que cinco meses de bioimpedância estável pedem e que nenhuma tela isolada consegue dar.

Registrar as 4 em `docs/ENGINES.md` junto das existentes. Adicionar as ações correspondentes ao mapeamento determinístico de `recommendationPolicy.ts`.

## 1.6 — API

Rotas thin, zero regra de negócio (`CLAUDE.md`):

```
GET    /api/v1/habits                 lista hábitos ativos + estado de hoje (log ou derivado)
POST   /api/v1/habits/{slug}/log      marca/atualiza { day, done, quantity?, note? } — upsert
DELETE /api/v1/habits/{slug}/log      desmarca { day }
GET    /api/v1/habits/week            grade dos últimos 7 dias + streak + adesão por hábito
```

`HabitRepository` em `domain/repositories.ts` + implementação Supabase em `repositories/habitRepository.ts`. Regra de negócio (o que conta como cumprido, o que entra no denominador) vive em `engines/habits/`, nunca na rota nem no repositório.

Rejeitar `POST` de log em hábito `source_kind='derived'` com 409 e mensagem explicando por onde registrar aquele dado.

## 1.7 — UI

**Check-in na home** — `modules/rotina/CheckinCard.tsx`: lista dos hábitos do dia, toggle de um toque, stepper para os de quantidade, barra de adesão do dia, streak ao lado de cada hábito. Client component; a home continua Server Component buscando dado já calculado.

**Tela `/plano`** — três blocos:

1. **Metas** — reaproveitar `GoalCard`/`GoalList` da Fase 6, sem reescrever.
2. **Semana** — grade 7 dias × hábito, com o alvo semanal e quanto falta ("escadas: 2 de 3").
3. **Referências** — cardápio, porções, regras e lista de compras, lidos de `web/src/content/planoSaude.ts` ([`PLANO-SAUDE.md` §5–8](PLANO-SAUDE.md)). Conteúdo estático, sem tabela: muda a cada poucos meses e o diff no git é o histórico desejado.

Mobile-first, alvos de toque ≥ 44 px, contraste válido no modo escuro (o commit `b16b780` já corrigiu gráficos ilegíveis no dark mode — não regredir).

---

# Etapa 2 — Navegação por rotina

**Objetivo:** o que o Pedro usa todo dia está a um toque; o resto está onde faz sentido procurar.

## 2.1 — O problema atual

`main` tem 4 abas (Hoje / Insights / Registro / Mais) com Sono, Exercícios, Corpo, Exames e Nutrição atrás de "Mais". A Fase 6 acrescenta Metas, Relatórios e Chat. São 12 destinos para 4 slots — sintoma de agrupamento por **fonte de dado** (cada fase virou uma aba) em vez de por **uso**.

## 2.2 — Estrutura nova

**5 abas fixas:**

| Aba | Rota | Conteúdo |
|---|---|---|
| **Hoje** | `/` | check-in de hábitos, adesão do dia, recovery, alerta de recomendação |
| **Plano** | `/plano` | metas, semana de hábitos, referências do plano |
| **Evolução** | `/evolucao` | hub com sub-abas: Corpo · Sono · Exercícios · Relatórios |
| **Insights** | `/insights` | insights, recomendações, correlações |
| **Mais** | `/mais` | Nutrição, Exames, Chat, Registro, sair |

**Registro vira ação, não aba.** Botão flutuante (FAB) na Hoje abrindo `/registro` — lançar peso ou refeição é ato deliberado e pontual, não um lugar que se visita. Mantém `/registro` como rota (não quebra nada) e libera um slot.

**Evolução** (`/evolucao`) é hub com sub-abas internas em `/evolucao/[secao]`, reaproveitando as telas existentes de `/corpo`, `/sono`, `/exercicios`, `/relatorios` — mover os módulos, não reescrevê-los. As rotas antigas viram `redirect()` permanente, para não quebrar link salvo nem PWA instalado.

Rejeitado: "home densa que resolve tudo". Uma home com check-in + metas + evolução + insights vira uma página de scroll infinito onde o check-in — a ação de 10 segundos que precisa acontecer todo dia — fica competindo com gráfico. A ação diária merece o topo de uma tela curta.

## 2.3 — Detalhes

- Ícone + rótulo em cada aba (só texto em 5 abas fica apertado num celular comum).
- Aba ativa correta em sub-rotas (`/evolucao/corpo` destaca Evolução) — a lógica de `MAIS_TAB_ROUTES` em `main` já resolve isso, generalizar.
- Sem rolagem horizontal na barra. Se não couber em 5, o problema é de arquitetura, não de largura.
- `NavBar` some em `/login` (comportamento atual, manter).

---

## Critério de pronto da Fase 7

1. Abrir o app de manhã mostra os hábitos do dia e marcar todos leva menos de 15 segundos.
2. `/plano` mostra as 4 metas com valor atual real, e a semana de hábitos com quanto falta.
3. Passada uma semana de uso, `habit.adherence.avg7d` tem valor e ao menos uma regra de insight de hábito dispara ou é explicitamente verificada como "não dispara porque a adesão está boa".
4. `/corpo` mostra a curva real de bioimpedância de fev a jul, com 22,7 % como valor mais recente.
5. Nenhum dado de teste em produção.
6. Cinco abas, nenhuma tela a mais de dois toques.
7. `npm test` / `typecheck` / `lint` / `build` verdes; deploy Ready.
8. Veredito escrito sobre o sync do Health Connect em `notas/Pendencias.md`.

O critério 3 é o único que depende de tempo real de uso — não pode ser marcado no mesmo dia da implementação. É proposital: é o único que prova que o app serve pra alguma coisa.

---

## Fora de escopo (registrar, não fazer)

- Planejamento alimentar com calendário e vínculo receita↔refeição — pendência aberta desde a Fase 5.
- Cadastro das receitas do plano em `recipes`.
- Notificações push de lembrete de hábito — depende de decidir a estratégia de PWA/push; sem isso, o check-in depende do Pedro abrir o app.
- Reescrita do `sync-app` — depende do veredito da Etapa 0.2.
- Ajuste automático da meta de escadas (5 → 8 subidas) — decisão do Pedro, não do sistema.

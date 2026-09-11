# Correções F1 — HealthIA

Substitui os prompts 2 e 3 de `AUDITORIA-F0.md`, que partiam da premissa errada
(cortar). A auditoria mostrou que o app é estruturalmente sadio: o problema é um
domínio faltando, três defeitos pontuais e a camada de design.

Base: `notas/auditoria/INVENTARIO.md`. Ordem recomendada: 1 → 6.
O 6 é independente e pode rodar a qualquer momento.

---

## 1. Faxina — 1 dia

Tudo que faz o app parecer quebrado sem ser difícil de arrumar.

```
Leia notas/auditoria/INVENTARIO.md. Crie a branch fix/faxina-f1 e faça:

a) UNIDADE DA ÁGUA
   web/src/modules/rotina/CheckinCard.tsx (stepQuantity :83-111, render :183-204).
   Hoje cada toque soma 1 litro e a tela não mostra unidade nenhuma.
   Troque por incrementos de 250 ml (+250ml / +500ml), exiba o total com unidade
   explícita e a meta ao lado ("1,75 L de 3 L").
   Decida e me justifique: manter em habit_logs.quantity, ou passar a gravar um
   health_event de hydration. Hoje existem dois caminhos de água que não conversam
   (o form de /registro cria evento, o CheckinCard não) — quero um só.

b) DISPENSAR INSIGHT
   healthia.insights.dismissed não tem caminho de escrita nenhum
   (web/src/repositories/insightRepository.ts). Há ~190 insights acumulados.
   Crie POST /api/v1/insights/[id]/dismiss espelhando o padrão de
   recommendations/[id]/done, e o botão em /insights.

c) META SEEDADA
   Verifique em web/supabase/migrations/*_009_seed_habits_goals.sql quais metas
   são criadas pelo seed. Me liste antes de mexer.
   Regra nova: o seed cria hábitos, não metas. Meta só existe se o usuário criar.
   Escreva a migration que remove as metas seedadas.

d) ÓRFÃOS
   - Unifique /metas em /plano (o /plano é a tela oficial e não tem criação nem
     lista de desativadas; /metas tem e não está linkada em lugar nenhum).
     Mova o que falta para /plano e apague src/app/metas/.
   - Corrija os links do toggle em src/app/evolucao/relatorios/page.tsx:31,41 para
     apontar direto a /evolucao/relatorios?type=... em vez de passar pelo 308.
   - Remova a dependência não usada expo-health-connect do sync-app/package.json.
   - Apague o diretório dashboard/ (resíduo não versionado da v1) e adicione ao
     .gitignore.

Rode lint, typecheck e vitest. Um commit por item. Atualize notas/.
```

---

## 2. Domínio de nutrição — o destrave principal

Uma correção que conserta cinco sintomas de uma vez.

```
Implemente o domínio de nutrição diária, que está documentado em docs/ENGINES.md
e nunca foi escrito. Branch feat/nutricao-diaria.

Problema: web/src/engines/analytics/analyticsService.ts:274-292 grava kcalIn,
proteinG e waterL como null incondicionalmente, mesmo havendo eventos reais de
meal e hydration em health_events.

a) Crie os calculators em web/src/engines/analytics/calculators/, no mesmo padrão
   dos 8 existentes (função pura + teste 1:1):
   computeKcalInDaily, computeProteinDaily, computeWaterDaily.
b) Registre nutrition.kcal.daily, nutrition.protein.daily e nutrition.water.daily
   em catalog.ts (METRIC_CATALOG) — hoje estão em docs/ENGINES.md e ausentes do
   catálogo.
c) Ligue em analyticsService.recomputeDay. O array hydrationEvents já é buscado na
   linha 122-126 e só é usado para adesão de hábito; passe a usá-lo aqui também.
d) Adicione o campo de proteína (g) em QuickEntryForm.tsx, tipo "Refeição"
   (:162-211). A API já aceita proteinG (domain/manualEntry.ts:30) — só a UI não
   envia. Sem isso o pipeline continua vazio mesmo depois de (a).
e) Rode POST /api/v1/admin/recompute sobre o histórico e confirme que passaram a
   sair valores em daily_summary.

Me mostre depois o que destravou: a meta nutrition.protein.avg7d, os três campos
de /evolucao/relatorios, a regra proteinBelowTarget e o contextBuilder da IA.
```

---

## 3. Upload de PDF de bioimpedância

```
Hoje só existe entrada manual de bioimpedância (BodyCompositionForm →
POST /api/v1/imports/bioimpedance). A última medição registrada é de 23/07/2026 —
o dado envelheceu porque digitar é chato, e é isso que faz as telas parecerem vazias.

Já existe o caminho pronto para exames: AIProvider.completeWithImage →
web/src/engines/ai/examExtraction.ts → LabImportFromFile.tsx, com revisão linha a
linha antes de gravar (ADR-006).

Replique esse padrão para laudos de InBody: aceite PDF ou foto, extraia peso, massa
muscular esquelética, massa de gordura, percentual de gordura, gordura visceral,
TMB e a data do exame, e apresente para revisão antes de gravar. A IA nunca grava
sozinha — mesma regra do ADR-006.

Importante: o PDF do InBody tem layout tabular estável. Tente extração de texto
primeiro (pdf parse) e só caia na IA se falhar.

Branch feat/import-bioimpedancia-pdf.
```

---

## 4. Design system

```
Leia a seção 6 de notas/auditoria/INVENTARIO.md antes de começar.

Estado atual: globals.css define 2 variáveis (--background, --foreground); 51 de 57
arquivos .tsx escolhem cor da paleta padrão do Tailwind ad hoc; src/components/ não
tem nenhum primitivo (só NavBar, LogoutButton, RegistroFab, EvolucaoSubNav,
WeekComparisonCard); modules/charts/chartTheme.ts é a única concessão compartilhada.

Etapa 1 — proponha, não implemente: tokens de cor (com uma identidade escolhida, não
neutro genérico), escala tipográfica, espaçamento, raio, elevação e estados,
declarados via @theme do Tailwind v4, funcionando em claro e escuro.
Apresente a proposta e espere aprovação.

Etapa 2 — depois de aprovada: primitivos Button, Card, Badge, Field, Stat, EmptyState,
Skeleton em src/components/ui/, e migre chartTheme.ts para consumir os mesmos tokens.

Etapa 3 — migre as telas uma por vez, uma branch por tela, começando pela home.
Nenhuma cor literal nova no JSX a partir daqui.
```

---

## 5. Mercado por voz + receitas

```
A lista de compras já existe pela metade: tabela shopping_list_items, rotas
/api/v1/shopping-list e .../[id]/bought, componente ShoppingList.tsx.

Falta:
a) Ponte com o Google Tasks. A API do Google Keep é exclusiva de conta Workspace
   Enterprise e não serve para conta pessoal; o Google Tasks tem API REST oficial e
   o Gemini escreve nela por voz. Implemente OAuth + sync bidirecional de uma lista
   nomeada ("Mercado") com shopping_list_items.
   ANTES DE CODAR: confirme comigo o resultado do teste de voz no relógio.
b) Normalização do item ditado: "2 pacote de arroz" → nome, quantidade, unidade.
   Reaproveite a tabela foods (93 itens seedados) para casar o nome.
c) Categoria por corredor (hortifrúti, açougue e frios, mercearia, bebidas, limpeza,
   higiene) e um modo compra agrupado por corredor, alvo de toque grande, offline.
d) Receita → lista: ingrediente que falta entra na lista e sobe para o Google Tasks.

Sobre o plano alimentar: hoje a seção "Referências" de /plano é conteúdo 100%
estático vindo de src/content/planoSaude.ts. É a parte do app que mais serve ao
usuário. Antes de dinamizar, me proponha o modelo de dados — não migre para tabela
sem desenhar a ligação refeição ↔ receita ↔ lista de compras.
```

---

## 6. Crash do sync-app — independente

```
O build preview do sync-app abre e fecha sozinho no celular, sem stack trace.
Leia o diagnóstico em notas/ (sessão de 2026-08-24/26, interrompida).

1. Me dê o comando exato de adb logcat filtrado para capturar o crash, e o que eu
   preciso ter instalado no Windows para rodá-lo.
2. Enquanto isso, revise sem alterar nada: app.json, eas.json, as permissões do
   Health Connect no AndroidManifest versus as que o código pede em
   sync-app/src/lib/healthConnect.ts, e a compatibilidade de versões
   expo × react-native-health-connect × SDK do Android.
3. Procure no git log e nas notas se o sync-app já leu dado real do Health Connect
   alguma vez, ou se nunca funcionou.
4. Proponha o caminho mais curto até um build que instale e leia um único tipo de
   dado (passos), ignorando todo o resto.

Não altere arquivo nenhum até eu ver o log.
```

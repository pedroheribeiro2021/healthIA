# Como iniciar a Fase 7 no Claude Code

Arquivo temporário de arranque. Depois que a Fase 7 fechar, pode apagar — a memória permanente do projeto é `docs/`, `notas/` e `CLAUDE.md`.

---

## Antes de abrir o terminal

Um passo só, e ele é seu (não do Claude Code): **decidir se aprova o plano**. Leia, nesta ordem:

1. `docs/PLANO-SAUDE.md` — seu plano estruturado. Confira se está fiel ao que você quis dizer, principalmente as metas do §3 e os hábitos do §4. Tudo depois disso é construído em cima deles.
2. `docs/FASE-7-ROTINA.md` — a especificação técnica. Se discordar de algo, é mais barato mudar aqui do que depois de implementado.

Se algo estiver errado no plano, corrija o markdown antes de começar. O Claude Code vai tratar esses dois arquivos como verdade.

---

## Prompt de arranque

Abra o terminal em `C:\Users\Paulo Ribeiro\OneDrive\Documents\healthIA` e cole:

```
Leia CLAUDE.md, docs/ROADMAP.md, docs/FASE-7-ROTINA.md e docs/PLANO-SAUDE.md antes
de qualquer coisa.

Vamos executar a Fase 7 na ordem da spec: Etapa 0 (diagnóstico e higiene dos dados),
depois Etapa 1 (hábitos, metas e check-in), depois Etapa 2 (navegação).

Comece pela Etapa 0.1: o merge da branch fase-6-metas-relatorios-ia em main.
Atenção ao conflito de NavBar documentado na spec — resolva a favor de main.
Me mostre o plano de merge antes de executar.

Não avance para a etapa seguinte sem me mostrar o resultado da anterior.
```

---

## Os quatro pontos onde ele deve parar e te perguntar

A spec pede confirmação explícita nestes momentos. Se ele passar direto por algum, interrompa.

**1. Antes do merge da Fase 6.** Dispara deploy de produção e traz três telas novas (`/metas`, `/relatorios`, `/chat`) de uma vez.

**2. Depois do diagnóstico do sync, antes de consertar qualquer coisa.** O que você precisa dele aqui é um **veredito**: o que quebrou, quanto custa consertar, e a recomendação de consertar agora ou registrar como fase própria. Se ele começar a reescrever o `sync-app` sem esse veredito, pare — é exatamente como o app chegou onde chegou.

**3. Antes de apagar dado.** Ele deve te mostrar a lista de ids a remover e esperar confirmação. `health_events` é append-only por princípio; essa exclusão é uma exceção pontual, e você precisa ver o que sai. Confira em especial que o **id 1 (peso 76,6 kg de 20/07) fica** — aquele é real.

**4. Antes das migrations 008/009.** Schema novo em produção. Nada de irreversível, mas vale ler o SQL.

---

## O que dá pra checar você mesmo, sem entender o código

Depois da Etapa 0:

- `/corpo` mostra uma curva de fevereiro a julho e o valor mais recente é **22,7 %** — não 17,8 %.
- Nenhum exame de vitamina D em `/exames`.

Depois da Etapa 1:

- A home abre com seus hábitos do dia e dá pra marcar todos em poucos toques.
- `/plano` mostra as 4 metas com valor atual real (peso deve aparecer perto de 77 kg).
- Marcar e desmarcar um hábito funciona e sobrevive ao reload.

Depois da Etapa 2:

- 5 abas, sem rolagem lateral.
- Nenhuma tela a mais de dois toques.

---

## Uma semana depois

O único critério de pronto que não dá pra marcar no dia da implementação: `habit.adherence.avg7d` só existe depois de sete dias de uso real. É de propósito. Ele é a única prova de que o app passou a servir pra alguma coisa — o resto é infraestrutura.

Quando chegar lá, vale voltar e pedir:

```
Passou uma semana desde a Fase 7. Rode POST /api/v1/admin/recompute no período,
me mostre minha adesão real por hábito e quais regras de insight dispararam.
Fecha o critério de pronto da Fase 7 no ROADMAP com esses números.
```

---

## Se a Fase 7 der certo, o que vem depois

Fica registrado em `docs/FASE-7-ROTINA.md` como fora de escopo, na ordem provável de valor:

1. **Veredito do sync** — se o conserto for caro, vira fase própria com decisão de arquitetura (foreground service, WorkManager, ou aceitar sync manual).
2. **Planejamento alimentar** — vincular receita ↔ refeição registrada, calendário. Pendência aberta desde a Fase 5.
3. **Notificações push** — sem lembrete, o check-in depende de você lembrar de abrir o app. É o maior risco de a Fase 7 não pegar.

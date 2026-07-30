# Plano de Saúde do Pedro — fonte da verdade do conteúdo

> Estruturação do documento `🏋️ Projeto saúde.md` (julho/2026) para virar dado dentro do HealthIA.
> Este arquivo é a **referência de conteúdo**: o que o app precisa saber sobre o plano.
> A especificação técnica de como implementar está em [`FASE-7-ROTINA.md`](FASE-7-ROTINA.md).

---

## 1. Ponto de partida — bioimpedância InBody de 23/07/2026

Medição clínica, arquivo `patients_MWJZnNyVqeODE9ROQWMZSo8X0fC3_anthropometries_*.pdf`.
Perfil: 174 cm, 33 anos, masculino.

| Indicador | Valor | Faixa de referência | Situação |
|---|---|---|---|
| Peso | **77,3 kg** | 56,6–76,6 | acima |
| Percentual de gordura | **22,7 %** | — | acima da meta |
| Massa de gordura | **17,5 kg** | 8–16 | acima |
| Massa magra (peso − gordura) | 59,8 kg | — | — |
| Massa muscular esquelética | **33,9 kg** | — | — |
| Água corporal total | 43,7 L | 37,5–45,8 | normal |
| Proteína | 11,9 kg | 10–12,3 | normal |
| Minerais | 4,1 kg | 3,4–4,2 | normal |
| IMC | 25,5 | 18,5–24,9 | acima |
| Taxa metabólica basal | 1.661 kcal | — | — |
| Relação cintura-quadril | 0,91 | 0,80–0,90 | acima |
| Nível de gordura visceral | 7 | 1–9 | normal |
| Grau de obesidade | 116 % | 90–110 | acima |
| Pontuação InBody | 76/100 | — | — |
| Peso ideal (InBody) | 70,3 kg | — | — |

**Recomendação do próprio laudo:** controle de peso −7 kg, controle de gordura −7 kg, controle muscular 0 kg.
Leitura: **perder gordura mantendo músculo** — exatamente o objetivo declarado no plano.

### Histórico segmentar (23/07/2026)

| Segmento | Massa magra | Gordura |
|---|---|---|
| Braço direito | 3,36 kg | 1,0 kg |
| Braço esquerdo | 3,35 kg | 1,0 kg |
| Tronco | 26,59 kg | 9,50 kg |
| Perna direita | 8,93 kg | 2,40 kg |
| Perna esquerda | 8,77 kg | 2,40 kg |

### Histórico de composição corporal (fev–jul/2026)

Valores lidos do gráfico "Histórico da Composição Corporal" do laudo — **arredondados pelo próprio InBody**, exceto a medição de 23/07 (que tem os valores exatos na página principal).

| Data | Peso (kg) | Músculo esquelético (kg) | Massa de gordura (kg) | % gordura (derivado) |
|---|---|---|---|---|
| 26/02/2026 | 77 | 34 | 17 | ~22,1 % |
| 27/03/2026 | 74 | 33 | 16 | ~21,6 % |
| 30/04/2026 | 75 | 32 | 17 | ~22,7 % |
| 26/05/2026 | 76 | 33 | 16 | ~21,1 % |
| 23/06/2026 | 76 | 33 | 17 | ~22,4 % |
| 23/07/2026 | **77,3** | **33,9** | **17,5** | **22,7 %** |

**Leitura honesta desses cinco meses:** peso oscilando entre 74 e 77 kg sem tendência clara, músculo estável em 32–34 kg, gordura estável em 16–17,5 kg. Cinco meses sem progresso mensurável na composição corporal — o que dá o contexto certo pra este trabalho: o problema não é falta de dado, é falta de adesão consistente e de um lugar que mostre isso.

O `% gordura` das cinco medições antigas é **derivado** (gordura ÷ peso) a partir de valores já arredondados, então carrega erro de até ~0,7 pp. Deve entrar no banco marcado como estimado, não como leitura direta do aparelho.

---

## 2. Objetivo

- Reduzir gordura corporal.
- Manter massa muscular.
- Consistência acima da perfeição.
- Reduzir iFood sem proibições.

## 3. Metas mensuráveis

| Meta | Alvo | Atual (23/07) | Direção |
|---|---|---|---|
| Peso | 73–74 kg | 77,3 kg | reduzir |
| Percentual de gordura | 17–18 % | 22,7 % | reduzir |
| Musculação | 4–5x/semana | — | aumentar |
| Escadas | 3x/semana | — | aumentar |
| Água (dia normal) | 3–3,5 L | — | manter |
| Água (dia de futebol) | 4 L | — | manter |
| Dormir | antes das 23h | — | manter |

Alvo único para as metas de faixa (o app trabalha com um número): **peso 73,5 kg**, **gordura 17,5 %**.

---

## 4. Hábitos — o checklist que vira dado

### Diários

| Slug | Nome | Tipo | Meta | Origem do dado |
|---|---|---|---|---|
| `agua` | Água | quantidade (L) | 3,0 L (4,0 em dia de futebol) | derivado de `hydration` |
| `creatina` | Creatina 5 g | booleano | todo dia | log próprio |
| `fruta` | Ao menos 1 fruta | booleano | todo dia | log próprio |
| `sem_ifood` | Sem iFood | booleano | 6 de 7 dias (regra 80/20) | log próprio |
| `dormir_cedo` | Dormir antes das 23h | booleano | todo dia | derivado de `sleep_session` |
| `proteina_refeicoes` | Proteína em todas as refeições | booleano | todo dia | log próprio |

### Semanais

| Slug | Nome | Tipo | Meta | Origem do dado |
|---|---|---|---|---|
| `musculacao` | Musculação | booleano | 4x/semana (ideal 5) | derivado de `workout` |
| `escadas` | Escadas (-1 ao 6º andar) | quantidade (subidas) | 3x/semana, 5 subidas → evoluir para 8 | log próprio |
| `cardio` | Cardio pós-treino (HIIT ou elíptico, 10–15 min) | booleano | 2x/semana (meta ideal, não obrigatória) | log próprio |

**Nota sobre escadas:** a progressão 5 → 8 subidas é parte da meta. O hábito registra a quantidade, não só o "fiz"; a meta de quantidade sobe quando o Pedro decidir — não automaticamente.

**Nota sobre cardio:** é "meta ideal" no plano original, não obrigatório. Não deve gerar alerta de adesão baixa com o mesmo peso de musculação e escadas.

---

## 5. Regras de alimentação

- Não cortar arroz, pão ou feijão.
- Priorizar proteína em todas as refeições.
- Ao menos 1 fruta por dia.
- Variar o jantar para evitar iFood.
- Regra 80/20 — 20 % de folga é parte do plano, não falha.

### Porções de referência (almoço)

| Item | Porção |
|---|---|
| Proteína | 1 palma da mão |
| Arroz | 2 colheres da colher da panela elétrica |
| Feijão | 1 concha pequena |
| Legumes | à vontade |
| Salada | quando possível |

### Cardápio de referência

**Café da manhã** (escolher uma opção)

- Pão francês + 2 ovos + café + iogurte Triple Zero
- Pão integral + omelete
- Tapioca + queijo minas
- Sanduíche de ovos
- Bacon: ocasionalmente

**Jantar**

- Hambúrguer de patinho
- Hambúrguer de frango
- Omelete recheada
- Nuggets caseiros
- Macarrão

**Lanche**

- Misto quente
- Sanduíche de atum
- Hambúrguer caseiro
- Ovos cozidos
- Iogurte Triple Zero
- Whey

**Frutas** — prioridade: laranja, mexerica, uva, siriguela. Alternativas: maçã, pera.

---

## 6. Receitas

### Marmitas

Patinho acebolado · Carne moída com tomate e shoyu · Frango grelhado · Frango ao curry · Frango xadrez leve · Lombo suíno · Tilápia grelhada · Carne desfiada com mandioca

### Hambúrguer de patinho (mesma montagem para o de frango)

Pão de hambúrguer · hambúrguer 120–150 g · muçarela ou cheddar · tomate · alface · cebola caramelizada · picles · ketchup e mostarda · bacon opcional (1–2 fatias)

### Sanduíche de atum

Atum em água · iogurte natural ou requeijão light · limão · cebola · cheiro-verde

### Nuggets caseiros

Frango moído · alho · cebola · páprica · pimenta · sal · aveia ou panko · air fryer ou forno

### Japonesa

Poke de tilápia · poke de salmão · sushi bowl · ceviche

### Sobremesas

Sorvete proteico (morango congelado + whey + leite) · uva congelada · gelatina zero · iogurte grego zero · mousse proteico

---

## 7. Suplementação

- Creatina: 5 g/dia
- Whey: para facilitar a ingestão de proteína

---

## 8. Lista de compras recorrente

**Proteínas** — patinho, carne moída, peito de frango, frango moído, tilápia, salmão, lombo suíno, atum, ovos, iogurte Triple Zero, whey.

**Carboidratos** — arroz integral, feijão, mandioca, batata, batata-doce, tapioca, pão francês, pão integral, pão de hambúrguer, macarrão integral.

**Hortifruti** — brócolis, cenoura, tomate, cebola, alface, pepino, abobrinha, vagem, abóbora, couve-flor, laranja, mexerica, uva, siriguela, maçã, pera.

---

## 9. O que deste documento vira o quê no app

| Seção | Destino no HealthIA |
|---|---|
| Bioimpedância 23/07 + histórico | `health_events` (`body_composition`, origem `clinical_bia`) — import na Etapa 0 |
| Metas mensuráveis (§3) | tabela `goals` — seed na Fase 7 |
| Hábitos (§4) | tabelas `habits` / `habit_logs` — novas na Fase 7 |
| Regras, porções, cardápio, receitas, lista de compras (§5–8) | conteúdo estático em `web/src/content/planoSaude.ts`, exibido na tela `/plano` |
| Receitas (§6) | opcionalmente cadastradas em `recipes` numa fase futura — **fora do escopo da Fase 7** |

O conteúdo estático fica em código, não em tabela: muda a cada poucos meses, não a cada dia, e não precisa de histórico. Colocar num arquivo TS versionado dá diff no git quando o plano muda — que é exatamente o rastro desejado.

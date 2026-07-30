// Conteúdo estático do plano do Pedro (docs/PLANO-SAUDE.md §5-8) — muda a
// cada poucos meses, não a cada dia, e não precisa de histórico. Fica em
// código versionado (não em tabela) de propósito: o diff no git é o rastro
// desejado quando o plano mudar (docs/PLANO-SAUDE.md §9).

export const REGRAS_ALIMENTACAO = [
  "Não cortar arroz, pão ou feijão.",
  "Priorizar proteína em todas as refeições.",
  "Ao menos 1 fruta por dia.",
  "Variar o jantar para evitar iFood.",
  "Regra 80/20 — 20% de folga é parte do plano, não falha.",
] as const;

export const PORCOES_REFERENCIA = [
  { item: "Proteína", porcao: "1 palma da mão" },
  { item: "Arroz", porcao: "2 colheres da colher da panela elétrica" },
  { item: "Feijão", porcao: "1 concha pequena" },
  { item: "Legumes", porcao: "à vontade" },
  { item: "Salada", porcao: "quando possível" },
] as const;

export const CARDAPIO_REFERENCIA = {
  cafeDaManha: [
    "Pão francês + 2 ovos + café + iogurte Triple Zero",
    "Pão integral + omelete",
    "Tapioca + queijo minas",
    "Sanduíche de ovos",
    "Bacon: ocasionalmente",
  ],
  jantar: [
    "Hambúrguer de patinho",
    "Hambúrguer de frango",
    "Omelete recheada",
    "Nuggets caseiros",
    "Macarrão",
  ],
  lanche: [
    "Misto quente",
    "Sanduíche de atum",
    "Hambúrguer caseiro",
    "Ovos cozidos",
    "Iogurte Triple Zero",
    "Whey",
  ],
  frutas: "Prioridade: laranja, mexerica, uva, siriguela. Alternativas: maçã, pera.",
} as const;

export const RECEITAS_REFERENCIA = [
  {
    categoria: "Marmitas",
    itens: [
      "Patinho acebolado",
      "Carne moída com tomate e shoyu",
      "Frango grelhado",
      "Frango ao curry",
      "Frango xadrez leve",
      "Lombo suíno",
      "Tilápia grelhada",
      "Carne desfiada com mandioca",
    ],
  },
  {
    categoria: "Hambúrguer de patinho (mesma montagem para o de frango)",
    itens: [
      "Pão de hambúrguer",
      "hambúrguer 120–150g",
      "muçarela ou cheddar",
      "tomate",
      "alface",
      "cebola caramelizada",
      "picles",
      "ketchup e mostarda",
      "bacon opcional (1–2 fatias)",
    ],
  },
  {
    categoria: "Sanduíche de atum",
    itens: ["Atum em água", "iogurte natural ou requeijão light", "limão", "cebola", "cheiro-verde"],
  },
  {
    categoria: "Nuggets caseiros",
    itens: ["Frango moído", "alho", "cebola", "páprica", "pimenta", "sal", "aveia ou panko", "air fryer ou forno"],
  },
  {
    categoria: "Japonesa",
    itens: ["Poke de tilápia", "poke de salmão", "sushi bowl", "ceviche"],
  },
  {
    categoria: "Sobremesas",
    itens: [
      "Sorvete proteico (morango congelado + whey + leite)",
      "uva congelada",
      "gelatina zero",
      "iogurte grego zero",
      "mousse proteico",
    ],
  },
] as const;

export const SUPLEMENTACAO = [
  { nome: "Creatina", dose: "5 g/dia" },
  { nome: "Whey", dose: "para facilitar a ingestão de proteína" },
] as const;

export const LISTA_DE_COMPRAS = {
  proteinas: [
    "patinho",
    "carne moída",
    "peito de frango",
    "frango moído",
    "tilápia",
    "salmão",
    "lombo suíno",
    "atum",
    "ovos",
    "iogurte Triple Zero",
    "whey",
  ],
  carboidratos: [
    "arroz integral",
    "feijão",
    "mandioca",
    "batata",
    "batata-doce",
    "tapioca",
    "pão francês",
    "pão integral",
    "pão de hambúrguer",
    "macarrão integral",
  ],
  hortifruti: [
    "brócolis",
    "cenoura",
    "tomate",
    "cebola",
    "alface",
    "pepino",
    "abobrinha",
    "vagem",
    "abóbora",
    "couve-flor",
    "laranja",
    "mexerica",
    "uva",
    "siriguela",
    "maçã",
    "pera",
  ],
} as const;

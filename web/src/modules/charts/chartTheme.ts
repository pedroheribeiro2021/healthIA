// Estilo compartilhado de eixo/tooltip do Recharts. Eixo e tooltip são
// renderizados pelo Recharts numa camada que não herda `className`
// Tailwind — cor precisa nascer em hex literal, senão herda `color` do
// `body` (que muda com o tema) e no modo escuro vira texto claro dentro da
// caixa branca padrão do tooltip, ilegível. Ticks usam #737373
// (neutral-500, contraste suficiente nos dois temas); tooltip fica sempre
// como cartão claro com texto escuro, independente do tema do site.
export const CHART_TICK_STYLE = { fill: "#737373" };

export const CHART_TOOLTIP_CONTENT_STYLE = {
  backgroundColor: "#ffffff",
  border: "1px solid #e5e5e5",
  borderRadius: 8,
  color: "#171717",
  fontSize: 12,
};

export const CHART_TOOLTIP_LABEL_STYLE = { color: "#171717", fontWeight: 600 };

export const CHART_TOOLTIP_ITEM_STYLE = { color: "#171717" };

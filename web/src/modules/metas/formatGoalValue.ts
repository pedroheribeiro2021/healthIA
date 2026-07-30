// Conversão SI -> exibição fica na UI (CLAUDE.md), nunca no engine. Cada
// metric_id de meta tem uma unidade de exibição própria.
export function formatGoalValue(metricId: string, value: number): string {
  switch (metricId) {
    case "sleep.duration.avg7d":
      return `${(value / 3600).toFixed(1)}h`;
    case "hr.resting.avg7d":
      return `${value.toFixed(0)} bpm`;
    case "hrv.rmssd.avg7d":
      return `${value.toFixed(0)} ms`;
    case "body.weight.avg7d":
      return `${value.toFixed(1)} kg`;
    case "nutrition.protein.avg7d":
      return `${value.toFixed(0)} g`;
    case "recovery.score.daily":
      return value.toFixed(0);
    case "habit.adherence.avg7d":
      return `${value.toFixed(0)}%`;
    case "body.fatpct.avg7d":
      return `${value.toFixed(1)}%`;
    case "training.sessions.7d":
      return `${value.toFixed(0)}x/semana`;
    default:
      return value.toFixed(1);
  }
}

// Unidade em que o Pedro digita o valor alvo no formulário (mais natural que
// SI puro pra sono — ninguém pensa em "28800 segundos").
export function goalInputUnitLabel(metricId: string): string {
  switch (metricId) {
    case "sleep.duration.avg7d":
      return "horas";
    case "hr.resting.avg7d":
      return "bpm";
    case "hrv.rmssd.avg7d":
      return "ms";
    case "body.weight.avg7d":
      return "kg";
    case "nutrition.protein.avg7d":
      return "g";
    case "recovery.score.daily":
      return "score 0-100";
    case "habit.adherence.avg7d":
    case "body.fatpct.avg7d":
      return "%";
    case "training.sessions.7d":
      return "vezes/semana";
    default:
      return "";
  }
}

// Inverso de formatGoalValue pro valor digitado -> SI antes de enviar à API
// (docs: "Unidades sempre no SI no banco... conversão só na UI").
export function toSiTargetValue(metricId: string, displayValue: number): number {
  if (metricId === "sleep.duration.avg7d") return displayValue * 3600;
  return displayValue;
}

// "YYYY-MM-DD" -> "DD/MM/YYYY" sem passar por Date (evita bug de timezone
// em datas sem horário, ver period.ts).
export function formatLocalDay(day: string): string {
  const [year, month, date] = day.split("-");
  return `${date}/${month}/${year}`;
}

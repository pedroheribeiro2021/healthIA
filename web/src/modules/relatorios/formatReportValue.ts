// Conversão SI -> exibição por campo de daily_summary (CLAUDE.md: "conversão
// só na UI"). Espelha modules/metas/formatGoalValue.ts, mas indexado por
// chave de daily_summary em vez de metric_id de meta.
export function formatReportValue(key: string, value: number): string {
  switch (key) {
    case "sleepDurationS":
      return `${(value / 3600).toFixed(1)}h`;
    case "restingHr":
      return `${value.toFixed(0)} bpm`;
    case "hrvRmssd":
      return `${value.toFixed(0)} ms`;
    case "weightKg":
      return `${value.toFixed(1)} kg`;
    case "proteinG":
      return `${value.toFixed(0)} g`;
    case "kcalIn":
      return `${value.toFixed(0)} kcal`;
    case "waterL":
      return `${value.toFixed(2)} L`;
    case "steps":
      return value.toFixed(0);
    case "recoveryScore":
    case "trainingLoad":
      return value.toFixed(0);
    default:
      return value.toFixed(1);
  }
}

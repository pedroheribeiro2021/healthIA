const COMPONENT_LABELS: Record<string, string> = {
  hrv: "HRV",
  sleep: "sono",
  rhr: "FC repouso",
  load: "carga de treino",
};

// recovery.score.daily renormaliza os pesos entre os sinais presentes
// (docs/ENGINES.md) — um score com só 1 de 4 sinais é matematicamente
// válido, mas pouco confiável (ex.: carga de treino zerada por falta de
// sync sozinha já empurra o score pra 100). Só formata o que o calculator
// já registrou em `detail.missing`, nenhum cálculo novo aqui.
export function recoveryHint(detail: unknown): string | undefined {
  if (!detail || typeof detail !== "object" || !("missing" in detail)) {
    return undefined;
  }
  const missing = (detail as { missing: unknown }).missing;
  if (!Array.isArray(missing) || missing.length === 0) return undefined;

  const present = 4 - missing.length;
  if (present <= 0) return undefined; // sem nenhum sinal: score é null, Tile já mostra "—"

  const missingLabels = missing
    .map((key) => COMPONENT_LABELS[key as string])
    .filter((label): label is string => Boolean(label));

  return missingLabels.length > 0
    ? `baseado em ${present} de 4 sinais — sem ${missingLabels.join(", ")}`
    : `baseado em ${present} de 4 sinais`;
}

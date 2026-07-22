import type { Macros } from "@/domain/nutrition";

const ZERO_MACROS: Macros = { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 };

// `per100g` é a unidade universal da base de alimentos — qualquer
// quantidade em gramas escala linearmente a partir daí.
export function scaleMacros(per100g: Macros, grams: number): Macros {
  const factor = grams / 100;
  return {
    kcal: per100g.kcal * factor,
    proteinG: per100g.proteinG * factor,
    carbsG: per100g.carbsG * factor,
    fatG: per100g.fatG * factor,
  };
}

export function sumMacros(items: (Macros | null)[]): Macros {
  return items.reduce<Macros>((acc, m) => {
    if (!m) return acc;
    return {
      kcal: acc.kcal + m.kcal,
      proteinG: acc.proteinG + m.proteinG,
      carbsG: acc.carbsG + m.carbsG,
      fatG: acc.fatG + m.fatG,
    };
  }, ZERO_MACROS);
}

export function perServing(total: Macros, servings: number): Macros {
  if (servings <= 0) return total;
  return {
    kcal: total.kcal / servings,
    proteinG: total.proteinG / servings,
    carbsG: total.carbsG / servings,
    fatG: total.fatG / servings,
  };
}

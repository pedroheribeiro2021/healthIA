import { describe, expect, it } from "vitest";
import { manualEntryInputSchema, manualRecordTypeFor } from "./manualEntry";

describe("manualEntryInputSchema", () => {
  it("aceita um lançamento de peso válido", () => {
    const result = manualEntryInputSchema.safeParse({
      type: "weight",
      occurredAt: "2026-07-20T10:00:00.000Z",
      kg: 82.4,
    });

    expect(result.success).toBe(true);
  });

  it("aceita hidratação válida", () => {
    const result = manualEntryInputSchema.safeParse({
      type: "hydration",
      occurredAt: "2026-07-20T10:00:00.000Z",
      liters: 0.5,
    });

    expect(result.success).toBe(true);
  });

  it("aceita refeição simples com macros opcionais e aplica default de mealType", () => {
    const result = manualEntryInputSchema.safeParse({
      type: "meal",
      occurredAt: "2026-07-20T12:00:00.000Z",
      description: "Frango com arroz",
      kcal: 650,
    });

    expect(result.success).toBe(true);
    if (result.success && result.data.type === "meal") {
      expect(result.data.mealType).toBe("other");
    }
  });

  it("aceita nota livre", () => {
    const result = manualEntryInputSchema.safeParse({
      type: "note",
      occurredAt: "2026-07-20T12:00:00.000Z",
      text: "Dor no joelho direito após o treino",
    });

    expect(result.success).toBe(true);
  });

  it("rejeita peso fora de faixa plausível", () => {
    const result = manualEntryInputSchema.safeParse({
      type: "weight",
      occurredAt: "2026-07-20T10:00:00.000Z",
      kg: -5,
    });

    expect(result.success).toBe(false);
  });

  it("rejeita occurredAt inválido", () => {
    const result = manualEntryInputSchema.safeParse({
      type: "weight",
      occurredAt: "não é uma data",
      kg: 80,
    });

    expect(result.success).toBe(false);
  });

  it("rejeita type desconhecido", () => {
    const result = manualEntryInputSchema.safeParse({
      type: "sleep",
      occurredAt: "2026-07-20T10:00:00.000Z",
    });

    expect(result.success).toBe(false);
  });
});

describe("manualRecordTypeFor", () => {
  it("mapeia cada tipo para o record_type esperado", () => {
    expect(manualRecordTypeFor("weight")).toBe("WeightEntry");
    expect(manualRecordTypeFor("hydration")).toBe("HydrationEntry");
    expect(manualRecordTypeFor("meal")).toBe("MealEntry");
    expect(manualRecordTypeFor("note")).toBe("NoteEntry");
  });
});

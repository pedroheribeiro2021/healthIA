import { describe, expect, it } from "vitest";
import { newGoalInputSchema } from "./goals";

describe("newGoalInputSchema", () => {
  it("aceita uma meta válida com deadline", () => {
    const result = newGoalInputSchema.safeParse({
      metricId: "body.weight.avg7d",
      targetValue: 78,
      direction: "decrease",
      deadline: "2026-12-31",
    });

    expect(result.success).toBe(true);
  });

  it("aceita meta sem deadline (opcional)", () => {
    const result = newGoalInputSchema.safeParse({
      metricId: "nutrition.protein.avg7d",
      targetValue: 140,
      direction: "increase",
    });

    expect(result.success).toBe(true);
  });

  it("aceita deadline null explícito", () => {
    const result = newGoalInputSchema.safeParse({
      metricId: "recovery.score.daily",
      targetValue: 80,
      direction: "maintain",
      deadline: null,
    });

    expect(result.success).toBe(true);
  });

  it("rejeita metricId vazio", () => {
    const result = newGoalInputSchema.safeParse({
      metricId: "",
      targetValue: 78,
      direction: "decrease",
    });

    expect(result.success).toBe(false);
  });

  it("rejeita direction desconhecida", () => {
    const result = newGoalInputSchema.safeParse({
      metricId: "body.weight.avg7d",
      targetValue: 78,
      direction: "up",
    });

    expect(result.success).toBe(false);
  });

  it("rejeita deadline em formato inválido", () => {
    const result = newGoalInputSchema.safeParse({
      metricId: "body.weight.avg7d",
      targetValue: 78,
      direction: "decrease",
      deadline: "31/12/2026",
    });

    expect(result.success).toBe(false);
  });
});

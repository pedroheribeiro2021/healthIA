import { describe, expect, it } from "vitest";
import { energyToKcal, massToGrams, massToKg, volumeToLiters } from "./units";

describe("massToKg", () => {
  it("converte gramas para kg", () => {
    expect(massToKg({ value: 82400, unit: "grams" })).toBeCloseTo(82.4);
  });

  it("mantém kg", () => {
    expect(massToKg({ value: 82.4, unit: "kilograms" })).toBe(82.4);
  });

  it("converte libras para kg", () => {
    expect(massToKg({ value: 180, unit: "pounds" })).toBeCloseTo(81.65, 1);
  });
});

describe("massToGrams", () => {
  it("converte kg para gramas", () => {
    expect(massToGrams({ value: 0.04, unit: "kilograms" })).toBeCloseTo(40);
  });
});

describe("volumeToLiters", () => {
  it("converte mililitros para litros", () => {
    expect(volumeToLiters({ value: 500, unit: "milliliters" })).toBeCloseTo(
      0.5,
    );
  });

  it("mantém litros", () => {
    expect(volumeToLiters({ value: 0.5, unit: "liters" })).toBe(0.5);
  });
});

describe("energyToKcal", () => {
  it("mantém kcal", () => {
    expect(energyToKcal({ value: 650, unit: "kilocalories" })).toBe(650);
  });

  it("converte kJ para kcal", () => {
    expect(energyToKcal({ value: 2720, unit: "kilojoules" })).toBeCloseTo(
      650,
      0,
    );
  });
});

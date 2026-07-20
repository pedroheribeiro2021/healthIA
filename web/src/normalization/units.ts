import type { Energy, Mass, Volume } from "@/domain/healthConnect";

export function massToKg(mass: Mass): number {
  switch (mass.unit) {
    case "kilograms":
      return mass.value;
    case "grams":
      return mass.value / 1_000;
    case "milligrams":
      return mass.value / 1_000_000;
    case "micrograms":
      return mass.value / 1_000_000_000;
    case "pounds":
      return mass.value * 0.45359237;
    case "ounces":
      return mass.value * 0.028349523125;
  }
}

export function massToGrams(mass: Mass): number {
  return massToKg(mass) * 1_000;
}

export function volumeToLiters(volume: Volume): number {
  switch (volume.unit) {
    case "liters":
      return volume.value;
    case "milliliters":
      return volume.value / 1_000;
    case "fluidOuncesUs":
      return volume.value * 0.0295735295625;
  }
}

export function energyToKcal(energy: Energy): number {
  switch (energy.unit) {
    case "kilocalories":
      return energy.value;
    case "calories":
      return energy.value / 1_000;
    case "kilojoules":
      return energy.value * 0.239006;
    case "joules":
      return energy.value * 0.000239006;
  }
}

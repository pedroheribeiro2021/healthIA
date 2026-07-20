import type { NewHealthEvent } from "@/domain/healthEvent";
import type { RawRecord } from "@/domain/rawRecord";
import {
  normalizeBodyFat,
  normalizeExerciseSession,
  normalizeHeartRate,
  normalizeHrv,
  normalizeHydration as normalizeHealthConnectHydration,
  normalizeNutrition,
  normalizeSleepSession,
  normalizeSteps,
  normalizeWeight as normalizeHealthConnectWeight,
} from "./healthConnect";
import {
  normalizeHydrationEntry,
  normalizeMealEntry,
  normalizeNoteEntry,
  normalizeWeightEntry,
} from "./manual";

type Normalizer = (raw: RawRecord) => NewHealthEvent[];

const registry = new Map<string, Normalizer>([
  ["manual:WeightEntry", normalizeWeightEntry],
  ["manual:HydrationEntry", normalizeHydrationEntry],
  ["manual:MealEntry", normalizeMealEntry],
  ["manual:NoteEntry", normalizeNoteEntry],

  ["health_connect:SleepSession", normalizeSleepSession],
  ["health_connect:ExerciseSession", normalizeExerciseSession],
  ["health_connect:HeartRate", normalizeHeartRate],
  ["health_connect:HeartRateVariabilityRmssd", normalizeHrv],
  ["health_connect:Steps", normalizeSteps],
  ["health_connect:Weight", normalizeHealthConnectWeight],
  ["health_connect:BodyFat", normalizeBodyFat],
  ["health_connect:Hydration", normalizeHealthConnectHydration],
  ["health_connect:Nutrition", normalizeNutrition],
]);

// Contrato do Normalization Engine (docs/ARCHITECTURE.md): raw_record ->
// health_events, resolvido por (source, record_type). Reprocessável a
// qualquer momento a partir de raw_records.
export function normalize(raw: RawRecord): NewHealthEvent[] {
  const normalizer = registry.get(`${raw.source}:${raw.recordType}`);
  if (!normalizer) {
    throw new Error(
      `sem normalizer registrado para ${raw.source}:${raw.recordType}`,
    );
  }
  return normalizer(raw);
}

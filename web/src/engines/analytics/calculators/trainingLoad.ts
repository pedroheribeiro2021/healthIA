import type { MetricResult, Period } from "@/domain/analytics";
import type { HealthEvent } from "@/domain/healthEvent";
import { isWithinPeriod } from "../period";
import { mean } from "../stats/basic";

const ALGO_VERSION = "v1";

type WorkoutLoad = {
  workoutId: number;
  durationMin: number;
  avgHr: number | null;
  intensityFactor: number;
  assumedIntensity: boolean;
  load: number;
};

// TRIMP simplificado sem precisar de idade/FC máxima (não há perfil de
// usuário no schema): load = duração(min) × (FC média do treino ÷ FC de
// repouso do dia). Sem amostra de FC sobrepondo o treino, ou sem FC de
// repouso do dia, cai pra intensityFactor=1 (carga = só duração),
// sinalizado em detail.assumedIntensity.
export function computeTrainingLoadDaily(
  events: HealthEvent[],
  period: Period,
  restingHrBpm: number | null,
): MetricResult {
  const workouts = events.filter(
    (e) => e.eventType === "workout" && isWithinPeriod(e.startTime, period),
  );
  const heartRateSamples = events.filter((e) => e.eventType === "heart_rate");

  const perWorkout: WorkoutLoad[] = workouts.map((workout) => {
    const durationMin = (workout.value ?? 0) / 60;
    const window: Period = {
      start: workout.startTime,
      end: workout.endTime ?? workout.startTime,
    };
    const samples = heartRateSamples.filter((e) =>
      isWithinPeriod(e.startTime, window),
    );
    const bpmValues = samples
      .map((e) => e.value)
      .filter((v): v is number => v !== null);
    const avgHr = mean(bpmValues);

    const canUseHr =
      avgHr !== null && restingHrBpm !== null && restingHrBpm > 0;
    const intensityFactor = canUseHr
      ? (avgHr as number) / (restingHrBpm as number)
      : 1;

    return {
      workoutId: workout.id,
      durationMin,
      avgHr,
      intensityFactor,
      assumedIntensity: !canUseHr,
      load: durationMin * intensityFactor,
    };
  });

  // Ausência de treino é informação válida (0), não dado faltante — não
  // usamos null aqui, diferente dos calculators de sono/peso/FC.
  const value = perWorkout.reduce((sum, w) => sum + w.load, 0);

  return {
    metricId: "training.load.daily",
    periodStart: period.start,
    periodEnd: period.end,
    value,
    detail: {
      workoutCount: perWorkout.length,
      perWorkout,
      assumedIntensity: perWorkout.some((w) => w.assumedIntensity),
    },
    algoVersion: ALGO_VERSION,
  };
}

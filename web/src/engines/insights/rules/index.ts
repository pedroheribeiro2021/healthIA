import type { InsightRule } from "../types";
import { acwrHigh } from "./acwrHigh";
import { consecutiveSoccerRecovery } from "./consecutiveSoccerRecovery";
import { habitAdherenceDrop } from "./habitAdherenceDrop";
import { habitStreakBroken } from "./habitStreakBroken";
import { hrvDropAfterShortSleep } from "./hrvDropAfterShortSleep";
import { labOutOfRange } from "./labOutOfRange";
import { proteinBelowTarget } from "./proteinBelowTarget";
import { sleepRegression } from "./sleepRegression";
import { stairsBelowTarget } from "./stairsBelowTarget";
import { weightPlateauLowAdherence } from "./weightPlateauLowAdherence";
import { weightTrendVsGoal } from "./weightTrendVsGoal";

// As 7 regras iniciais (Fase 4) + 4 de hábitos/rotina (Fase 7,
// docs/FASE-7-ROTINA.md 1.5) do Insight Engine (docs/ENGINES.md).
export const INSIGHT_RULES: readonly InsightRule[] = [
  hrvDropAfterShortSleep,
  consecutiveSoccerRecovery,
  weightTrendVsGoal,
  proteinBelowTarget,
  sleepRegression,
  acwrHigh,
  labOutOfRange,
  habitAdherenceDrop,
  habitStreakBroken,
  stairsBelowTarget,
  weightPlateauLowAdherence,
];

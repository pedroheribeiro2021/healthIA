import type { InsightRule } from "../types";
import { acwrHigh } from "./acwrHigh";
import { consecutiveSoccerRecovery } from "./consecutiveSoccerRecovery";
import { hrvDropAfterShortSleep } from "./hrvDropAfterShortSleep";
import { labOutOfRange } from "./labOutOfRange";
import { proteinBelowTarget } from "./proteinBelowTarget";
import { sleepRegression } from "./sleepRegression";
import { weightTrendVsGoal } from "./weightTrendVsGoal";

// As 7 regras iniciais do Insight Engine (docs/ENGINES.md).
export const INSIGHT_RULES: readonly InsightRule[] = [
  hrvDropAfterShortSleep,
  consecutiveSoccerRecovery,
  weightTrendVsGoal,
  proteinBelowTarget,
  sleepRegression,
  acwrHigh,
  labOutOfRange,
];

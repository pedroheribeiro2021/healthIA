import type { LocalDay, Period } from "@/domain/analytics";
import type { HealthEvent } from "@/domain/healthEvent";
import {
  findSleepSessionForDay,
  minutesSinceLocalNoon,
} from "@/engines/analytics/calculators/sleep";
import { isWithinPeriod } from "@/engines/analytics/period";

export type DerivedHabitResult = { done: boolean; quantity: number | null };

// 23h local, na mesma escala de sleep.ts (minutos desde o meio-dia local) —
// ver comentário de minutesSinceLocalNoon lá: a escala cresce
// monotonicamente ao longo da virada da meia-noite, então "< BEFORE_23H"
// já exclui corretamente qualquer horário de madrugada (que mapeia acima
// desse valor, não abaixo).
const BEFORE_23H_MINUTES_SINCE_NOON = 11 * 60;

// Resolver explícito por slug (não motor genérico configurável) — só 3
// casos conhecidos hoje; abstração aqui só adicionaria superfície pra
// errar (docs/FASE-7-ROTINA.md, 1.1). `events` deve já vir filtrado pelo
// chamador para os health_events relevantes ao hábito (mesma convenção dos
// calculators do Analytics Engine — v. engines/analytics/analyticsService.ts).
export function resolveDerivedHabit(
  slug: string,
  day: LocalDay,
  period: Period,
  events: HealthEvent[],
  targetPerDay: number | null,
): DerivedHabitResult | null {
  switch (slug) {
    case "musculacao": {
      const done = events.some(
        (e) => e.eventType === "workout" && isWithinPeriod(e.startTime, period),
      );
      return { done, quantity: null };
    }

    case "agua": {
      const totalL = events
        .filter(
          (e) =>
            e.eventType === "hydration" && isWithinPeriod(e.startTime, period),
        )
        .reduce((sum, e) => sum + (e.value ?? 0), 0);
      if (totalL === 0) return { done: false, quantity: null };
      const done = targetPerDay !== null ? totalL >= targetPerDay : true;
      return { done, quantity: totalL };
    }

    case "dormir_cedo": {
      const found = findSleepSessionForDay(events, period);
      if (!found) return { done: false, quantity: null };
      const done =
        minutesSinceLocalNoon(found.session.startTime) <
        BEFORE_23H_MINUTES_SINCE_NOON;
      return { done, quantity: null };
    }

    default:
      return null;
  }
}

export const DERIVED_HABIT_SLUGS = ["musculacao", "agua", "dormir_cedo"] as const;
export function isDerivedHabitSlug(
  slug: string,
): slug is (typeof DERIVED_HABIT_SLUGS)[number] {
  return (DERIVED_HABIT_SLUGS as readonly string[]).includes(slug);
}

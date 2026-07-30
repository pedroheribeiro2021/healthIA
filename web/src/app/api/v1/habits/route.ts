import { NextResponse } from "next/server";
import { todayLocalDay } from "@/engines/analytics/period";
import { getTodayHabitStates } from "@/engines/habits/habitService";
import { createEventRepositoryFromClient } from "@/repositories/eventRepository";
import { createHabitRepositoryFromClient } from "@/repositories/habitRepository";
import { authenticateRequest } from "@/repositories/supabase/auth";

// Rota thin: lista hábitos ativos + estado de hoje (log manual ou
// derivado) — toda a regra de "o que conta como feito" vive em
// engines/habits/habitService.ts (docs/FASE-7-ROTINA.md, 1.6).
export async function GET(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth) {
    return NextResponse.json({ error: "não autenticado" }, { status: 401 });
  }

  const habitRepo = createHabitRepositoryFromClient(auth.client);
  const eventRepo = createEventRepositoryFromClient(auth.client);
  const states = await getTodayHabitStates(habitRepo, eventRepo, todayLocalDay());

  return NextResponse.json(states, { status: 200 });
}

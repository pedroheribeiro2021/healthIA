import { NextResponse } from "next/server";
import { todayLocalDay } from "@/engines/analytics/period";
import { getHabitWeek } from "@/engines/habits/habitService";
import { createEventRepositoryFromClient } from "@/repositories/eventRepository";
import { createHabitRepositoryFromClient } from "@/repositories/habitRepository";
import { authenticateRequest } from "@/repositories/supabase/auth";

// Grade dos últimos 7 dias + streak + adesão por hábito (docs/FASE-7-ROTINA.md, 1.6).
export async function GET(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth) {
    return NextResponse.json({ error: "não autenticado" }, { status: 401 });
  }

  const habitRepo = createHabitRepositoryFromClient(auth.client);
  const eventRepo = createEventRepositoryFromClient(auth.client);
  const week = await getHabitWeek(habitRepo, eventRepo, todayLocalDay());

  return NextResponse.json(week, { status: 200 });
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { localDaySchema } from "@/domain/analytics";
import { newHabitLogInputSchema } from "@/domain/habits";
import {
  assertLoggable,
  HabitNotLoggableError,
} from "@/engines/habits/habitService";
import { createHabitRepositoryFromClient } from "@/repositories/habitRepository";
import { authenticateRequest } from "@/repositories/supabase/auth";

async function findHabitBySlug(
  habitRepo: ReturnType<typeof createHabitRepositoryFromClient>,
  slug: string,
) {
  const habits = await habitRepo.listActiveHabits();
  return habits.find((h) => h.slug === slug) ?? null;
}

// Upsert por dia (docs/FASE-7-ROTINA.md, 1.6) — habit_logs é mutável,
// diferente do resto do schema (ADR-005). Rejeita hábito 'derived' com 409:
// aquele dado vem de health_events, não de um toque na UI.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const auth = await authenticateRequest(request);
  if (!auth) {
    return NextResponse.json({ error: "não autenticado" }, { status: 401 });
  }

  const { slug } = await params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "corpo inválido: JSON esperado" }, { status: 400 });
  }

  const parsed = newHabitLogInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "corpo inválido", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const habitRepo = createHabitRepositoryFromClient(auth.client);
  const habit = await findHabitBySlug(habitRepo, slug);
  if (!habit) {
    return NextResponse.json({ error: "hábito não encontrado" }, { status: 404 });
  }

  try {
    assertLoggable(habit);
  } catch (error) {
    if (error instanceof HabitNotLoggableError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    throw error;
  }

  const log = await habitRepo.upsertLog(habit.id, parsed.data);
  return NextResponse.json(log, { status: 200 });
}

const deleteBodySchema = z.object({ day: localDaySchema });

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const auth = await authenticateRequest(request);
  if (!auth) {
    return NextResponse.json({ error: "não autenticado" }, { status: 401 });
  }

  const { slug } = await params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "corpo inválido: JSON esperado" }, { status: 400 });
  }

  const parsed = deleteBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "corpo inválido", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const habitRepo = createHabitRepositoryFromClient(auth.client);
  const habit = await findHabitBySlug(habitRepo, slug);
  if (!habit) {
    return NextResponse.json({ error: "hábito não encontrado" }, { status: 404 });
  }

  try {
    assertLoggable(habit);
  } catch (error) {
    if (error instanceof HabitNotLoggableError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    throw error;
  }

  await habitRepo.deleteLog(habit.id, parsed.data.day);
  return NextResponse.json({ ok: true }, { status: 200 });
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { newShoppingListItemInputSchema, shoppingListStatusSchema } from "@/domain/nutrition";
import { createShoppingListRepositoryFromClient } from "@/repositories/shoppingListRepository";
import { authenticateRequest } from "@/repositories/supabase/auth";

const querySchema = z.object({ status: shoppingListStatusSchema.default("open") });

export async function GET(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth) {
    return NextResponse.json({ error: "não autenticado" }, { status: 401 });
  }

  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    status: url.searchParams.get("status") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: "parâmetros inválidos", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const shoppingListRepo = createShoppingListRepositoryFromClient(auth.client);
  const items = await shoppingListRepo.listByStatus(parsed.data.status);

  return NextResponse.json(items, { status: 200 });
}

export async function POST(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth) {
    return NextResponse.json({ error: "não autenticado" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "corpo inválido: JSON esperado" }, { status: 400 });
  }

  const parsed = newShoppingListItemInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "corpo inválido", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const shoppingListRepo = createShoppingListRepositoryFromClient(auth.client);
  const item = await shoppingListRepo.addItem(parsed.data);

  return NextResponse.json(item, { status: 201 });
}

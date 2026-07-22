import { NextResponse } from "next/server";
import { createShoppingListRepositoryFromClient } from "@/repositories/shoppingListRepository";
import { authenticateRequest } from "@/repositories/supabase/auth";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await authenticateRequest(request);
  if (!auth) {
    return NextResponse.json({ error: "não autenticado" }, { status: 401 });
  }

  const { id } = await params;
  const itemId = Number(id);
  if (!Number.isInteger(itemId)) {
    return NextResponse.json({ error: "id inválido" }, { status: 400 });
  }

  const shoppingListRepo = createShoppingListRepositoryFromClient(auth.client);
  const item = await shoppingListRepo.markBought(itemId);

  return NextResponse.json(item, { status: 200 });
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { createFoodRepositoryFromClient } from "@/repositories/foodRepository";
import { authenticateRequest } from "@/repositories/supabase/auth";

const querySchema = z.object({ search: z.string().min(1).max(100) });

export async function GET(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth) {
    return NextResponse.json({ error: "não autenticado" }, { status: 401 });
  }

  const url = new URL(request.url);
  const parsed = querySchema.safeParse({ search: url.searchParams.get("search") });
  if (!parsed.success) {
    return NextResponse.json(
      { error: "parâmetros inválidos", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const foodRepo = createFoodRepositoryFromClient(auth.client);
  const foods = await foodRepo.searchFoods(parsed.data.search);

  return NextResponse.json(foods, { status: 200 });
}

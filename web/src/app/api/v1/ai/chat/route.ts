import { NextResponse } from "next/server";
import { z } from "zod";
import { getAIProvider } from "@/engines/ai/adapter";
import { buildChatContext } from "@/engines/ai/chatService";
import { todayLocalDay } from "@/engines/analytics/period";
import { createGoalRepositoryFromClient } from "@/repositories/goalRepository";
import { createInsightRepositoryFromClient } from "@/repositories/insightRepository";
import { createMetricRepositoryFromClient } from "@/repositories/metricRepository";
import { createRecommendationRepositoryFromClient } from "@/repositories/recommendationRepository";
import { authenticateRequest } from "@/repositories/supabase/auth";

const messageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(4000),
});
const chatRequestSchema = z.object({
  messages: z.array(messageSchema).min(1),
});

export async function POST(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth) {
    return NextResponse.json({ error: "não autenticado" }, { status: 401 });
  }

  const provider = getAIProvider();
  if (!provider) {
    return NextResponse.json(
      { error: "chat indisponível: nenhum provider de IA configurado" },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "corpo inválido: JSON esperado" }, { status: 400 });
  }

  const parsed = chatRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "corpo inválido", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const { messages } = parsed.data;
  if (messages[messages.length - 1].role !== "user") {
    return NextResponse.json(
      { error: "a última mensagem precisa ser do usuário" },
      { status: 400 },
    );
  }

  const { system } = await buildChatContext(
    {
      metricRepo: createMetricRepositoryFromClient(auth.client),
      goalRepo: createGoalRepositoryFromClient(auth.client),
      insightRepo: createInsightRepositoryFromClient(auth.client),
      recommendationRepo: createRecommendationRepositoryFromClient(auth.client),
    },
    todayLocalDay(),
  );

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const chunk of provider.stream(system, messages)) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: chunk })}\n\n`));
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      } catch (err) {
        const message = err instanceof Error ? err.message : "erro desconhecido";
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: message })}\n\n`));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}

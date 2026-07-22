import type { AIProvider, Message } from "../types";
import { parseSseLines } from "./sse";

// Modelo do free tier validado pelo Pedro em Google AI Studio (Pendencias.md
// listava isso como decisão em aberto) — sobrescrevível via GEMINI_MODEL
// caso o free tier mude o nome do modelo disponível.
export const GEMINI_DEFAULT_MODEL = "gemini-2.5-flash";

function toGeminiRole(role: Message["role"]): "user" | "model" {
  return role === "assistant" ? "model" : "user";
}

type GeminiResponse = {
  candidates?: { content?: { parts?: { text?: string }[] } }[];
};

function extractText(payload: unknown): string {
  const data = payload as GeminiResponse;
  return (
    data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? ""
  );
}

async function requestFailure(response: Response): Promise<Error> {
  const body = await response.text().catch(() => "");
  return new Error(`Gemini respondeu ${response.status}: ${body}`);
}

// Via fetch direto à API REST (não o SDK @google/genai) — mantém
// "SDKs de IA só em engines/ai/providers/" trivialmente verdadeiro e evita
// adicionar uma dependência pesada só pra um app de usuário único.
export function createGeminiProvider(apiKey: string, model = GEMINI_DEFAULT_MODEL): AIProvider {
  const base = `https://generativelanguage.googleapis.com/v1beta/models/${model}`;

  function requestBody(system: string, messages: Message[]) {
    return JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: messages.map((m) => ({
        role: toGeminiRole(m.role),
        parts: [{ text: m.content }],
      })),
    });
  }

  return {
    name: "gemini",

    async complete(system, messages) {
      const response = await fetch(`${base}:generateContent?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: requestBody(system, messages),
      });
      if (!response.ok) throw await requestFailure(response);
      return extractText(await response.json());
    },

    async *stream(system, messages) {
      const response = await fetch(`${base}:streamGenerateContent?alt=sse&key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: requestBody(system, messages),
      });
      if (!response.ok) throw await requestFailure(response);
      if (!response.body) return;

      for await (const rawEvent of parseSseLines(response.body)) {
        let text = "";
        try {
          text = extractText(JSON.parse(rawEvent));
        } catch {
          continue;
        }
        if (text) yield text;
      }
    },
  };
}

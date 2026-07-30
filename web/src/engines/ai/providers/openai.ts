import type { AIProvider, Message } from "../types";
import { parseSseLines } from "./sse";

export const OPENAI_DEFAULT_MODEL = "gpt-4o-mini";

type OpenAIResponse = { choices?: { message?: { content?: string } }[] };
type OpenAIStreamChunk = { choices?: { delta?: { content?: string } }[] };

async function requestFailure(response: Response): Promise<Error> {
  const body = await response.text().catch(() => "");
  return new Error(`OpenAI respondeu ${response.status}: ${body}`);
}

function headers(apiKey: string): HeadersInit {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
  };
}

function toChatMessages(system: string, messages: Message[]) {
  return [{ role: "system", content: system }, ...messages];
}

// Via fetch direto (Chat Completions API REST), sem o SDK `openai` — mesmo
// racional de gemini.ts.
export function createOpenAIProvider(apiKey: string, model = OPENAI_DEFAULT_MODEL): AIProvider {
  return {
    name: "openai",

    async complete(system, messages) {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: headers(apiKey),
        body: JSON.stringify({ model, messages: toChatMessages(system, messages) }),
      });
      if (!response.ok) throw await requestFailure(response);

      const data = (await response.json()) as OpenAIResponse;
      return data.choices?.[0]?.message?.content ?? "";
    },

    async *stream(system, messages) {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: headers(apiKey),
        body: JSON.stringify({
          model,
          messages: toChatMessages(system, messages),
          stream: true,
        }),
      });
      if (!response.ok) throw await requestFailure(response);
      if (!response.body) return;

      for await (const rawEvent of parseSseLines(response.body)) {
        if (rawEvent === "[DONE]") break;
        let chunk: OpenAIStreamChunk;
        try {
          chunk = JSON.parse(rawEvent);
        } catch {
          continue;
        }
        const text = chunk.choices?.[0]?.delta?.content ?? "";
        if (text) yield text;
      }
    },
  };
}

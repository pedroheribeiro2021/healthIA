import type { AIProvider, Message } from "../types";
import { parseSseLines } from "./sse";

export const ANTHROPIC_DEFAULT_MODEL = "claude-sonnet-5";
const ANTHROPIC_VERSION = "2023-06-01";
const MAX_TOKENS = 1024;

type AnthropicContentBlock = { type: string; text?: string };
type AnthropicResponse = { content?: AnthropicContentBlock[] };
type AnthropicStreamEvent = {
  type?: string;
  delta?: { type?: string; text?: string };
};

async function requestFailure(response: Response): Promise<Error> {
  const body = await response.text().catch(() => "");
  return new Error(`Anthropic respondeu ${response.status}: ${body}`);
}

function headers(apiKey: string): HeadersInit {
  return {
    "Content-Type": "application/json",
    "x-api-key": apiKey,
    "anthropic-version": ANTHROPIC_VERSION,
  };
}

// Via fetch direto (Messages API REST), sem o SDK @anthropic-ai/sdk — mesmo
// racional de gemini.ts: adapter plugável sem dependência extra.
export function createAnthropicProvider(
  apiKey: string,
  model = ANTHROPIC_DEFAULT_MODEL,
): AIProvider {
  return {
    name: "anthropic",

    async complete(system, messages) {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: headers(apiKey),
        body: JSON.stringify({ model, max_tokens: MAX_TOKENS, system, messages }),
      });
      if (!response.ok) throw await requestFailure(response);

      const data = (await response.json()) as AnthropicResponse;
      return (data.content ?? [])
        .filter((block) => block.type === "text")
        .map((block) => block.text ?? "")
        .join("");
    },

    async *stream(system, messages: Message[]) {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: headers(apiKey),
        body: JSON.stringify({
          model,
          max_tokens: MAX_TOKENS,
          system,
          messages,
          stream: true,
        }),
      });
      if (!response.ok) throw await requestFailure(response);
      if (!response.body) return;

      for await (const rawEvent of parseSseLines(response.body)) {
        let event: AnthropicStreamEvent;
        try {
          event = JSON.parse(rawEvent);
        } catch {
          continue;
        }
        if (event.type === "content_block_delta" && event.delta?.type === "text_delta") {
          const text = event.delta.text ?? "";
          if (text) yield text;
        }
      }
    },
  };
}

import { afterEach, describe, expect, it, vi } from "vitest";
import { createAnthropicProvider } from "./anthropic";

function sseBody(rawEvents: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  let i = 0;
  return {
    getReader() {
      return {
        async read() {
          if (i < rawEvents.length) {
            const value = encoder.encode(rawEvents[i]);
            i += 1;
            return { done: false, value };
          }
          return { done: true, value: undefined };
        },
        releaseLock() {},
      };
    },
  } as unknown as ReadableStream<Uint8Array>;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("createAnthropicProvider", () => {
  it("complete() envia headers/model corretos e junta blocos de texto", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ content: [{ type: "text", text: "resposta real" }] }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const provider = createAnthropicProvider("fake-key");
    const result = await provider.complete("instrução fixa", [
      { role: "user", content: "e aí?" },
    ]);

    expect(result).toBe("resposta real");
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.anthropic.com/v1/messages");
    expect(init.headers["x-api-key"]).toBe("fake-key");
    expect(init.headers["anthropic-version"]).toBe("2023-06-01");
    const body = JSON.parse(init.body);
    expect(body.system).toBe("instrução fixa");
    expect(body.messages).toEqual([{ role: "user", content: "e aí?" }]);
  });

  it("stream() só extrai texto de eventos content_block_delta/text_delta", async () => {
    const events =
      `data: ${JSON.stringify({ type: "message_start" })}\n\n` +
      `data: ${JSON.stringify({ type: "content_block_delta", delta: { type: "text_delta", text: "Olá" } })}\n\n` +
      `data: ${JSON.stringify({ type: "content_block_delta", delta: { type: "text_delta", text: "!" } })}\n\n` +
      `data: ${JSON.stringify({ type: "message_stop" })}\n\n`;

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, status: 200, body: sseBody([events]) }),
    );

    const provider = createAnthropicProvider("fake-key");
    const chunks: string[] = [];
    for await (const chunk of provider.stream("sistema", [{ role: "user", content: "oi" }])) {
      chunks.push(chunk);
    }

    expect(chunks).toEqual(["Olá", "!"]);
  });

  it("lança erro quando a API responde com status de erro", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 401, text: async () => "chave inválida" }),
    );

    const provider = createAnthropicProvider("fake-key");
    await expect(provider.complete("s", [])).rejects.toThrow(/401/);
  });
});

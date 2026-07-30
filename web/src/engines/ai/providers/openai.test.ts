import { afterEach, describe, expect, it, vi } from "vitest";
import { createOpenAIProvider } from "./openai";

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

describe("createOpenAIProvider", () => {
  it("complete() prefixa a instrução fixa como mensagem system e extrai o texto", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ choices: [{ message: { content: "resposta real" } }] }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const provider = createOpenAIProvider("fake-key");
    const result = await provider.complete("instrução fixa", [
      { role: "user", content: "e aí?" },
    ]);

    expect(result).toBe("resposta real");
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.openai.com/v1/chat/completions");
    expect(init.headers.Authorization).toBe("Bearer fake-key");
    const body = JSON.parse(init.body);
    expect(body.messages).toEqual([
      { role: "system", content: "instrução fixa" },
      { role: "user", content: "e aí?" },
    ]);
  });

  it("stream() concatena os deltas e para no [DONE]", async () => {
    const events =
      `data: ${JSON.stringify({ choices: [{ delta: { content: "Olá" } }] })}\n\n` +
      `data: ${JSON.stringify({ choices: [{ delta: { content: ", tudo bem" } }] })}\n\n` +
      `data: [DONE]\n\n`;

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, status: 200, body: sseBody([events]) }),
    );

    const provider = createOpenAIProvider("fake-key");
    const chunks: string[] = [];
    for await (const chunk of provider.stream("sistema", [{ role: "user", content: "oi" }])) {
      chunks.push(chunk);
    }

    expect(chunks).toEqual(["Olá", ", tudo bem"]);
  });

  it("lança erro quando a API responde com status de erro", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 500, text: async () => "erro interno" }),
    );

    const provider = createOpenAIProvider("fake-key");
    await expect(provider.complete("s", [])).rejects.toThrow(/500/);
  });
});

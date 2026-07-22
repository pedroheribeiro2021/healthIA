import { afterEach, describe, expect, it, vi } from "vitest";
import { createGeminiProvider } from "./gemini";

function sseBody(events: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  let i = 0;
  return {
    getReader() {
      return {
        async read() {
          if (i < events.length) {
            const value = encoder.encode(`data: ${events[i]}\n\n`);
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

describe("createGeminiProvider", () => {
  it("complete() envia system/contents corretos e extrai o texto da resposta", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: "resposta real" }] } }],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const provider = createGeminiProvider("fake-key");
    const result = await provider.complete("instrução fixa", [
      { role: "user", content: "e aí?" },
      { role: "assistant", content: "tudo bem" },
    ]);

    expect(result).toBe("resposta real");
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain(":generateContent?key=fake-key");
    const body = JSON.parse(init.body);
    expect(body.systemInstruction.parts[0].text).toBe("instrução fixa");
    // Gemini usa "model" em vez de "assistant".
    expect(body.contents).toEqual([
      { role: "user", parts: [{ text: "e aí?" }] },
      { role: "model", parts: [{ text: "tudo bem" }] },
    ]);
  });

  it("stream() concatena os deltas de texto de cada evento SSE", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      body: sseBody([
        JSON.stringify({ candidates: [{ content: { parts: [{ text: "Olá" }] } }] }),
        JSON.stringify({ candidates: [{ content: { parts: [{ text: ", tudo bem" }] } }] }),
      ]),
    });
    vi.stubGlobal("fetch", fetchMock);

    const provider = createGeminiProvider("fake-key");
    const chunks: string[] = [];
    for await (const chunk of provider.stream("sistema", [{ role: "user", content: "oi" }])) {
      chunks.push(chunk);
    }

    expect(chunks).toEqual(["Olá", ", tudo bem"]);
    expect(fetchMock.mock.calls[0][0]).toContain(":streamGenerateContent?alt=sse&key=fake-key");
  });

  it("lança erro quando a API responde com status de erro", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 429, text: async () => "quota excedida" }),
    );

    const provider = createGeminiProvider("fake-key");
    await expect(provider.complete("s", [])).rejects.toThrow(/429/);
  });
});

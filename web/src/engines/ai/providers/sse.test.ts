import { describe, expect, it } from "vitest";
import { parseSseLines } from "./sse";

function fakeStream(chunks: string[]): ReadableStream<Uint8Array> {
  let i = 0;
  const encoder = new TextEncoder();
  return {
    getReader() {
      return {
        async read() {
          if (i < chunks.length) {
            const value = encoder.encode(chunks[i]);
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

async function collect(gen: AsyncGenerator<string>): Promise<string[]> {
  const out: string[] = [];
  for await (const item of gen) out.push(item);
  return out;
}

describe("parseSseLines", () => {
  it("extrai linhas data: de eventos completos num único chunk", async () => {
    const stream = fakeStream(['data: {"a":1}\n\ndata: {"a":2}\n\n']);
    const lines = await collect(parseSseLines(stream));
    expect(lines).toEqual(['{"a":1}', '{"a":2}']);
  });

  it("remonta um evento fragmentado em múltiplos chunks", async () => {
    const stream = fakeStream(["data: {\"a\":", '1}\n\n']);
    const lines = await collect(parseSseLines(stream));
    expect(lines).toEqual(['{"a":1}']);
  });

  it("ignora linhas que não começam com data:", async () => {
    const stream = fakeStream(["event: message\ndata: {\"a\":1}\n\n"]);
    const lines = await collect(parseSseLines(stream));
    expect(lines).toEqual(['{"a":1}']);
  });

  it("retorna vazio pra stream sem eventos", async () => {
    const stream = fakeStream([]);
    const lines = await collect(parseSseLines(stream));
    expect(lines).toEqual([]);
  });
});

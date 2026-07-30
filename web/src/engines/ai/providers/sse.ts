// Parser de stream SSE compartilhado pelos 3 providers (Gemini, Anthropic,
// OpenAI expõem streaming como Server-Sent Events com framing idêntico:
// eventos separados por linha em branco, payload em linhas "data: ...").
// Cada provider extrai o texto do delta a partir do JSON do payload —
// só o framing é comum.
export async function* parseSseLines(
  stream: ReadableStream<Uint8Array>,
): AsyncGenerator<string> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let separatorIndex: number;
      while ((separatorIndex = buffer.indexOf("\n\n")) !== -1) {
        const rawEvent = buffer.slice(0, separatorIndex);
        buffer = buffer.slice(separatorIndex + 2);

        for (const line of rawEvent.split("\n")) {
          if (line.startsWith("data:")) {
            yield line.slice(5).trim();
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

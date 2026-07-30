import { ANTHROPIC_DEFAULT_MODEL, createAnthropicProvider } from "./providers/anthropic";
import { createGeminiProvider, GEMINI_DEFAULT_MODEL } from "./providers/gemini";
import { createOpenAIProvider, OPENAI_DEFAULT_MODEL } from "./providers/openai";
import type { AIProvider } from "./types";

// Adapter (docs/ENGINES.md): `AI_PROVIDER` escolhe o provider, default
// gemini (free tier). Sem a chave correspondente configurada, retorna null
// e o chat fica indisponível — o resto do app funciona normalmente.
export function getAIProvider(): AIProvider | null {
  const providerName = process.env.AI_PROVIDER || "gemini";

  switch (providerName) {
    case "gemini": {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) return null;
      return createGeminiProvider(apiKey, process.env.GEMINI_MODEL || GEMINI_DEFAULT_MODEL);
    }
    case "anthropic": {
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) return null;
      return createAnthropicProvider(
        apiKey,
        process.env.ANTHROPIC_MODEL || ANTHROPIC_DEFAULT_MODEL,
      );
    }
    case "openai": {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) return null;
      return createOpenAIProvider(apiKey, process.env.OPENAI_MODEL || OPENAI_DEFAULT_MODEL);
    }
    default:
      return null;
  }
}

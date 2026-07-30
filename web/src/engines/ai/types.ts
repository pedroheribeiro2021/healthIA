export type MessageRole = "user" | "assistant";

export type Message = {
  role: MessageRole;
  content: string;
};

// Contrato de docs/ENGINES.md — implementações concretas só em
// engines/ai/providers/ (SDKs/chamadas de IA nunca fora daqui).
export interface AIProvider {
  name: string;
  complete(system: string, messages: Message[]): Promise<string>;
  stream(system: string, messages: Message[]): AsyncIterable<string>;
}

export type MessageRole = "user" | "assistant";

export type Message = {
  role: MessageRole;
  content: string;
};

export type ImageInput = { mimeType: string; base64: string };

// Contrato de docs/ENGINES.md — implementações concretas só em
// engines/ai/providers/ (SDKs/chamadas de IA nunca fora daqui).
export interface AIProvider {
  name: string;
  complete(system: string, messages: Message[]): Promise<string>;
  stream(system: string, messages: Message[]): AsyncIterable<string>;
  // Extração de texto/estrutura a partir de uma imagem (ex.: laudo de
  // exame fotografado) — não é chat, por isso não usa Message[]. Sempre
  // uma chamada única (sem streaming): o chamador precisa da resposta
  // inteira pra fazer JSON.parse.
  completeWithImage(system: string, prompt: string, image: ImageInput): Promise<string>;
}

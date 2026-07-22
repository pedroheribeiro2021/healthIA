"use client";

import { useState } from "react";
import type { Message } from "@/engines/ai/types";
import { parseSseLines } from "@/engines/ai/providers/sse";

const bubbleClass: Record<Message["role"], string> = {
  user: "self-end bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900",
  assistant:
    "self-start bg-white text-neutral-900 border border-neutral-200 dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-800",
};

export function ChatPanel({ initialQuestion }: { initialQuestion?: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState(initialQuestion ?? "");
  const [sending, setSending] = useState(false);
  const [unavailable, setUnavailable] = useState(false);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const question = input.trim();
    if (!question || sending) return;

    const nextMessages: Message[] = [...messages, { role: "user", content: question }];
    setMessages([...nextMessages, { role: "assistant", content: "" }]);
    setInput("");
    setSending(true);
    setUnavailable(false);

    try {
      const response = await fetch("/api/v1/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages }),
      });

      if (response.status === 503) {
        setUnavailable(true);
        setMessages(nextMessages);
        return;
      }
      if (!response.ok || !response.body) {
        throw new Error(`chat respondeu ${response.status}`);
      }

      let assistantText = "";
      for await (const rawEvent of parseSseLines(response.body)) {
        if (rawEvent === "[DONE]") break;
        let payload: { text?: string; error?: string };
        try {
          payload = JSON.parse(rawEvent);
        } catch {
          continue;
        }
        if (payload.error) {
          assistantText += `\n[erro: ${payload.error}]`;
        } else if (payload.text) {
          assistantText += payload.text;
        }
        const finalText = assistantText;
        setMessages([...nextMessages, { role: "assistant", content: finalText }]);
      }
    } catch {
      setMessages([
        ...nextMessages,
        { role: "assistant", content: "Não foi possível falar com a IA agora. Tente novamente." },
      ]);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex w-full max-w-md flex-1 flex-col gap-4">
      {unavailable && (
        <div className="rounded-xl border border-dashed border-neutral-300 p-4 text-center text-sm text-neutral-500 dark:border-neutral-700">
          Chat indisponível: nenhum provider de IA configurado. O resto do
          app continua funcionando normalmente.
        </div>
      )}

      <div className="flex flex-1 flex-col gap-3 overflow-y-auto">
        {messages.length === 0 && !unavailable && (
          <div className="rounded-xl border border-dashed border-neutral-300 p-4 text-center text-sm text-neutral-500 dark:border-neutral-700">
            Pergunte algo como &ldquo;meu condicionamento está evoluindo?&rdquo;
            — a resposta usa os indicadores já calculados.
          </div>
        )}
        {messages.map((message, index) => (
          <div
            key={index}
            className={`max-w-[85%] whitespace-pre-wrap rounded-xl px-3 py-2 text-sm ${bubbleClass[message.role]}`}
          >
            {message.content || "..."}
          </div>
        ))}
      </div>

      <form onSubmit={handleSend} className="flex gap-2">
        <textarea
          rows={2}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend(e);
            }
          }}
          placeholder="Pergunte sobre seus indicadores..."
          className="flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
        />
        <button
          type="submit"
          disabled={sending || !input.trim()}
          className="shrink-0 rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900"
        >
          {sending ? "..." : "Enviar"}
        </button>
      </form>
    </div>
  );
}

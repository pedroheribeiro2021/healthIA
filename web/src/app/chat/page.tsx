import { ChatPanel } from "@/modules/chat/ChatPanel";

export default async function ChatPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;

  return (
    <main className="flex flex-1 flex-col items-center gap-4 bg-neutral-50 px-6 py-8 pb-20 dark:bg-neutral-950">
      <h1 className="w-full max-w-md text-lg font-semibold text-neutral-900 dark:text-neutral-100">
        Chat
      </h1>
      <ChatPanel initialQuestion={q} />
    </main>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUserId } from "@/lib/currentUser";
import { getThread } from "@/lib/chat";
import { StylistChat } from "@/app/_components/StylistChat";
import { chatClosetItems } from "../closetItems";

export default async function ChatThreadPage({ params }: { params: Promise<{ threadId: string }> }) {
  const { threadId } = await params;
  const userId = await requireUserId();
  const [thread, items] = await Promise.all([getThread(userId, threadId), chatClosetItems()]);
  if (!thread) notFound();

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
      <Link href="/assistant" className="inline-block py-1 text-sm text-black/50 hover:underline dark:text-white/50">
        ← All chats
      </Link>
      <h1 className="mb-4 mt-2 truncate text-xl font-semibold tracking-tight">{thread.title ?? "Chat"}</h1>
      <StylistChat threadId={thread.id} initialMessages={thread.messages} items={items} />
    </div>
  );
}

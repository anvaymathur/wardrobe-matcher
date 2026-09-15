import Link from "next/link";
import { StylistChat } from "@/app/_components/StylistChat";
import { chatClosetItems } from "../closetItems";

export default async function NewChatPage({
  searchParams,
}: {
  searchParams: Promise<{ tag?: string }>;
}) {
  const { tag } = await searchParams;
  const items = await chatClosetItems();

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
      <Link href="/assistant" className="inline-block py-1 text-sm text-black/50 hover:underline dark:text-white/50">
        ← All chats
      </Link>
      <h1 className="mb-4 mt-2 text-2xl font-semibold tracking-tight">New chat</h1>
      <StylistChat threadId={null} initialMessages={[]} items={items} initialTagIds={tag ? [tag] : []} />
    </div>
  );
}

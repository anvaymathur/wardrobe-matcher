"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { startChatThread } from "@/lib/aiActions";
import { LIMITS } from "@/lib/ai/models";
import type { ShownItem, StylistUIMessage } from "@/lib/ai/stylistChat";
import { SEARCH_TOOL, searchResultUrls, verifyProducts, type ProductCard } from "@/lib/ai/products";
import { ChatText } from "./ChatText";
import { ItemPickerGrid } from "./ItemPickerGrid";
import { ItemThumb } from "./ItemThumb";

const MAX_TAGS = 4;

// Only the newest message goes to the server (history is stored there), plus
// the thread id passed with each send.
const transport = new DefaultChatTransport<StylistUIMessage>({
  api: "/api/chat",
  prepareSendMessagesRequest: ({ messages, body }) => ({
    body: { id: body?.id, message: messages[messages.length - 1] },
  }),
});

const STARTERS = [
  "What goes with the item I tagged?",
  "Put together an outfit for a dinner date",
  "Find a hoodie under $60 that matches the item I tagged",
];

function ProductCards({ products }: { products: ProductCard[] }) {
  if (products.length === 0) {
    return <p className="text-xs text-black/50 dark:text-white/50">No verified product links came back for that search.</p>;
  }
  return (
    <ul className="flex flex-col gap-2">
      {products.map((p) => (
        <li key={p.url} className="rounded-xl border border-black/10 bg-background p-3 dark:border-white/15">
          <p className="line-clamp-2 text-sm font-medium">{p.title}</p>
          <p className="mt-0.5 text-xs text-black/50 dark:text-white/50">
            {p.store}
            {p.price ? <span className="font-semibold text-foreground"> · {p.price}</span> : null}
          </p>
          {p.reason && <p className="mt-1.5 text-xs leading-snug text-black/65 dark:text-white/65">{p.reason}</p>}
          <a
            href={p.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex items-center gap-1 rounded-full bg-foreground px-3 py-1.5 text-xs font-semibold text-background hover:opacity-90"
          >
            View on {p.store} ↗
          </a>
        </li>
      ))}
    </ul>
  );
}

function ItemCards({ items, caption }: { items: ShownItem[]; caption: string | null }) {
  if (items.length === 0) return null;
  return (
    <div className="mt-1">
      {caption && <p className="mb-1.5 text-xs font-medium text-black/50 dark:text-white/50">{caption}</p>}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {items.map((item) => (
          <Link
            key={item.id}
            href={`/items/${item.id}`}
            className="w-24 shrink-0 rounded-lg border border-black/10 p-1.5 hover:border-foreground dark:border-white/15"
          >
            <ItemThumb item={item} size="h-[5.25rem] w-full" />
            <p className="mt-1 truncate text-xs font-medium">{item.name}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

function Pending({ label }: { label: string }) {
  return <p className="animate-pulse text-xs text-black/45 dark:text-white/45">{label}</p>;
}

/** Chat with the stylist. Only the newest message is sent (history lives on
 * the server); the thread is created on first send, not on page load. */
export function StylistChat({
  threadId,
  initialMessages,
  items,
  initialTagIds = [],
}: {
  threadId: string | null;
  initialMessages: StylistUIMessage[];
  items: ShownItem[];
  initialTagIds?: string[];
}) {
  const threadRef = useRef(threadId);
  const { messages, sendMessage, status, error, stop, clearError } = useChat<StylistUIMessage>({
    id: threadId ?? undefined,
    messages: initialMessages,
    transport,
  });

  const byId = new Map(items.map((i) => [i.id, i]));
  const [input, setInput] = useState("");
  const [tagIds, setTagIds] = useState<string[]>(initialTagIds.filter((id) => byId.has(id)));
  const [picking, setPicking] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  const busy = starting || status === "submitted" || status === "streaming";
  const full = messages.length >= LIMITS.maxThreadMessages;
  const tooLong = input.length > LIMITS.maxMessageChars;

  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, status]);

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || busy || full || trimmed.length > LIMITS.maxMessageChars) return;
    setStartError(null);
    clearError();

    if (!threadRef.current) {
      setStarting(true);
      const created = await startChatThread();
      setStarting(false);
      if (!created.ok) {
        setStartError(created.error);
        return;
      }
      threadRef.current = created.data.id;
      // Give the chat its own URL without reloading the page.
      window.history.replaceState(null, "", `/assistant/${created.data.id}`);
    }

    const taggedItemIds = tagIds;
    setInput("");
    setTagIds([]);
    await sendMessage({ text: trimmed, metadata: { taggedItemIds } }, { body: { id: threadRef.current } });
  };

  const toggleTag = (id: string) =>
    setTagIds((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : prev.length >= MAX_TAGS ? prev : [...prev, id],
    );

  const last = messages[messages.length - 1];
  const waitingForReply = status === "submitted" && last?.role === "user";

  return (
    <div className="flex flex-col gap-4">
      {messages.length === 0 && (
        <div className="rounded-xl border border-violet-500/30 bg-violet-500/5 p-4">
          <p className="text-sm font-medium">Ask about your wardrobe ✨</p>
          <p className="mt-1 text-xs text-black/55 dark:text-white/55">
            Tag items you own to ask about them — what to wear them with, or what to buy that matches.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {STARTERS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setInput(s)}
                className="rounded-full border border-black/15 bg-background px-3 py-1.5 text-xs hover:border-violet-500 dark:border-white/20"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      <ul className="flex flex-col gap-3">
        {messages.map((m) => {
          if (m.role === "user") {
            const tagged = (m.metadata?.taggedItemIds ?? []).map((id) => byId.get(id)).filter(Boolean) as ShownItem[];
            return (
              <li key={m.id} className="ml-auto flex max-w-[85%] flex-col items-end gap-1.5">
                {tagged.length > 0 && (
                  <div className="flex gap-1.5">
                    {tagged.map((t) => (
                      <ItemThumb key={t.id} item={t} size="h-10 w-10" />
                    ))}
                  </div>
                )}
                <div className="whitespace-pre-wrap rounded-2xl rounded-br-md bg-foreground px-3.5 py-2 text-sm text-background">
                  {m.parts.map((p) => (p.type === "text" ? p.text : "")).join("")}
                </div>
              </li>
            );
          }
          // Links and product cards only count if they came from this reply's web search.
          const found = searchResultUrls(m.parts);
          const allowedLinks = new Set(found.keys());
          return (
            <li key={m.id} className="mr-auto flex w-full max-w-[92%] flex-col gap-2 rounded-2xl rounded-bl-md bg-black/[0.04] px-3.5 py-2.5 dark:bg-white/[0.06]">
              {m.parts.map((part, i) => {
                switch (part.type) {
                  case "text":
                    return part.text ? <ChatText key={i} text={part.text} allowedLinks={allowedLinks} /> : null;
                  case `tool-${SEARCH_TOOL}`: {
                    if (part.state !== "output-available") return <Pending key={i} label="Searching the web…" />;
                    const failed = typeof part.output === "object" && part.output !== null && "error" in part.output;
                    return failed ? (
                      <p key={i} className="text-xs text-black/50 dark:text-white/50">
                        Web search isn&apos;t available right now.
                      </p>
                    ) : null;
                  }
                  case "tool-showProducts":
                    return part.state === "output-available" ? (
                      <ProductCards key={i} products={verifyProducts(part.output.products, found)} />
                    ) : (
                      <Pending key={i} label="Picking the best options…" />
                    );
                  case "tool-showItems":
                    return part.state === "output-available" ? (
                      <ItemCards key={i} items={part.output.items} caption={part.output.caption} />
                    ) : (
                      <Pending key={i} label="Pulling up items…" />
                    );
                  case "tool-getItemDetails":
                    return part.state === "output-available" ? null : <Pending key={i} label="Looking through your closet…" />;
                  default:
                    return null;
                }
              })}
            </li>
          );
        })}
        {waitingForReply && (
          <li className="mr-auto rounded-2xl rounded-bl-md bg-black/[0.04] px-3.5 py-2.5 dark:bg-white/[0.06]">
            <Pending label="Thinking…" />
          </li>
        )}
      </ul>

      {(error || startError) && (
        <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">
          {startError ?? error?.message ?? "Something went wrong. Please try again."}
        </p>
      )}

      {full ? (
        <p className="rounded-lg border border-black/10 px-3 py-3 text-sm dark:border-white/15">
          This chat is full.{" "}
          <Link href="/assistant/new" className="font-medium underline">
            Start a new chat
          </Link>{" "}
          to keep going.
        </p>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void send(input);
          }}
          className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-20 flex flex-col gap-2 rounded-2xl border border-black/15 bg-background p-2 shadow-sm sm:bottom-3 dark:border-white/20"
        >
          {tagIds.length > 0 && (
            <div className="flex flex-wrap gap-1.5 px-1 pt-1">
              {tagIds.map((id) => {
                const item = byId.get(id);
                if (!item) return null;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => toggleTag(id)}
                    className="flex items-center gap-1.5 rounded-full bg-violet-500/10 py-0.5 pl-0.5 pr-2.5 text-xs font-medium"
                    aria-label={`Remove ${item.name}`}
                  >
                    <ItemThumb item={item} size="h-6 w-6" initialOnly />
                    <span className="max-w-[8rem] truncate">{item.name}</span>
                    <span aria-hidden>×</span>
                  </button>
                );
              })}
            </div>
          )}
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                void send(input);
              }
            }}
            rows={input.length > 80 ? 3 : 1}
            placeholder="Ask your stylist…"
            className="w-full resize-none bg-transparent px-2 py-1.5 text-base outline-none placeholder:text-black/35 sm:text-sm dark:placeholder:text-white/30"
          />
          <div className="flex items-center justify-between gap-2 px-1">
            <button
              type="button"
              onClick={() => setPicking(true)}
              disabled={items.length === 0}
              className="rounded-full border border-black/15 px-3 py-1 text-xs font-medium hover:border-violet-500 disabled:opacity-40 dark:border-white/20"
            >
              + Tag item{tagIds.length ? ` (${tagIds.length}/${MAX_TAGS})` : ""}
            </button>
            <div className="flex items-center gap-2">
              {input.length > LIMITS.maxMessageChars * 0.8 && (
                <span className={`text-xs ${tooLong ? "text-red-600" : "text-black/40 dark:text-white/40"}`}>
                  {input.length}/{LIMITS.maxMessageChars}
                </span>
              )}
              {status === "streaming" ? (
                <button
                  type="button"
                  onClick={() => void stop()}
                  className="rounded-full border border-black/20 px-3.5 py-1.5 text-xs font-semibold dark:border-white/25"
                >
                  Stop
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={busy || !input.trim() || tooLong}
                  className="rounded-full bg-violet-600 px-3.5 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
                >
                  {starting ? "…" : "Send"}
                </button>
              )}
            </div>
          </div>
        </form>
      )}
      <div ref={endRef} />

      {picking && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" onClick={() => setPicking(false)}>
          <div
            className="max-h-[80vh] w-full max-w-2xl overflow-y-auto rounded-t-2xl bg-background p-4 sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-medium">
                Tag items <span className="font-normal text-black/45 dark:text-white/45">· up to {MAX_TAGS}</span>
              </p>
              <button
                type="button"
                onClick={() => setPicking(false)}
                className="rounded-full bg-foreground px-3.5 py-1.5 text-xs font-semibold text-background"
              >
                Done
              </button>
            </div>
            <ItemPickerGrid items={items} selected={new Set(tagIds)} onToggle={toggleTag} />
          </div>
        </div>
      )}
    </div>
  );
}

import Link from "next/link";
import { requireUserId } from "@/lib/currentUser";
import { listThreads } from "@/lib/chat";
import { deleteChatThread } from "@/lib/aiActions";

const dateFmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });

export default async function AssistantPage() {
  const threads = await listThreads(await requireUserId());

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Stylist ✨</h1>
        <Link
          href="/assistant/new"
          className="rounded-full bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
        >
          New chat
        </Link>
      </div>
      <p className="mt-1 text-sm text-black/55 dark:text-white/55">
        Ask what to wear, what goes with an item, or what to buy next. Tag your own items to ask about them.
      </p>

      {threads.length === 0 ? (
        <p className="mt-8 rounded-xl border border-dashed border-black/15 px-6 py-12 text-center text-sm text-black/50 dark:border-white/20 dark:text-white/50">
          No chats yet.{" "}
          <Link href="/assistant/new" className="font-medium text-foreground underline">
            Start one
          </Link>
          .
        </p>
      ) : (
        <ul className="mt-6 flex flex-col divide-y divide-black/10 rounded-xl border border-black/10 dark:divide-white/10 dark:border-white/15">
          {threads.map((t) => (
            <li key={t.id} className="flex items-center gap-3 px-3 py-2.5">
              <Link href={`/assistant/${t.id}`} className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{t.title}</p>
                <p className="text-xs text-black/45 dark:text-white/45">{dateFmt.format(t.updatedAt)}</p>
              </Link>
              <form action={deleteChatThread}>
                <input type="hidden" name="id" value={t.id} />
                <button
                  type="submit"
                  aria-label={`Delete chat “${t.title}”`}
                  className="rounded px-2 py-1 text-xs font-medium text-red-600 hover:underline dark:text-red-400"
                >
                  Delete
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

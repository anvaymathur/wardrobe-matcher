import Link from "next/link";
import { auth, signOut } from "@/auth";
import { getCollections } from "@/lib/collections";
import { ThemeToggle } from "@/app/_components/ThemeToggle";
import { SwipeSettings } from "@/app/_components/SwipeSettings";
import { DeleteCollectionButton } from "@/app/_components/DeleteCollectionButton";

export default async function SettingsPage() {
  const [session, collections] = await Promise.all([auth(), getCollections()]);

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-6 sm:px-6 sm:py-8">
      <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>

      <section className="mt-6">
        <h2 className="mb-2 text-sm font-medium text-black/60 dark:text-white/60">
          Account
        </h2>
        <div className="flex items-center justify-between gap-3 rounded-lg border border-black/10 p-4 dark:border-white/15">
          <span className="truncate text-sm">{session?.user?.email ?? "Signed in"}</span>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/signin" });
            }}
          >
            <button
              type="submit"
              className="shrink-0 rounded-full border border-black/15 px-3 py-1.5 text-sm font-medium hover:border-foreground dark:border-white/20"
            >
              Sign out
            </button>
          </form>
        </div>
      </section>

      <section className="mt-6">
        <h2 className="mb-2 text-sm font-medium text-black/60 dark:text-white/60">
          Appearance
        </h2>
        <div className="flex items-center justify-between rounded-lg border border-black/10 p-4 dark:border-white/15">
          <span className="text-sm font-medium">Theme</span>
          <ThemeToggle />
        </div>
      </section>

      <section className="mt-8">
        <h2 className="mb-2 text-sm font-medium text-black/60 dark:text-white/60">
          Closet swipe actions
        </h2>
        <div className="rounded-lg border border-black/10 p-4 dark:border-white/15">
          <SwipeSettings />
        </div>
      </section>

      <section className="mt-8">
        <h2 className="mb-2 text-sm font-medium text-black/60 dark:text-white/60">
          Closets
        </h2>
        <div className="rounded-lg border border-black/10 p-1 dark:border-white/15">
          {collections.length === 0 ? (
            <p className="p-3 text-sm text-black/50 dark:text-white/50">
              No separate closets yet. Create one from the “+ New” chip on the Closet tab.
            </p>
          ) : (
            <ul className="divide-y divide-black/10 dark:divide-white/10">
              {collections.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-3 p-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{c.name}</p>
                    <p className="text-xs text-black/50 dark:text-white/50">
                      {c._count.items} item{c._count.items === 1 ? "" : "s"}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Link
                      href={`/collections/${c.id}/edit`}
                      className="rounded px-2 py-1.5 text-sm font-medium text-black/60 hover:underline dark:text-white/60"
                    >
                      Edit
                    </Link>
                    <DeleteCollectionButton id={c.id} name={c.name} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        <p className="mt-1.5 px-1 text-xs text-black/45 dark:text-white/45">
          Deleting a closet keeps its items in your main closet.
        </p>
      </section>
    </div>
  );
}

import { ThemeToggle } from "@/app/_components/ThemeToggle";
import { SwipeSettings } from "@/app/_components/SwipeSettings";

export default function SettingsPage() {
  return (
    <div className="mx-auto w-full max-w-lg px-4 py-6 sm:px-6 sm:py-8">
      <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>

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
    </div>
  );
}

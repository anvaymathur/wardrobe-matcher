import { login } from "@/lib/auth";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col px-6 py-20">
      <h1 className="text-2xl font-semibold tracking-tight">Wardrobe Matcher</h1>
      <p className="mt-1 text-sm text-black/60 dark:text-white/60">
        Enter the password to continue.
      </p>

      <form action={login} className="mt-6 flex flex-col gap-3">
        <input
          name="password"
          type="password"
          required
          autoFocus
          placeholder="Password"
          className="w-full rounded-md border border-black/15 bg-background text-foreground px-3 py-2 text-sm outline-none focus:border-foreground dark:border-white/20"
        />
        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">Incorrect password.</p>
        )}
        <button
          type="submit"
          className="rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90"
        >
          Log in
        </button>
      </form>
    </div>
  );
}

import { signIn } from "@/auth";

export default function SignInPage() {
  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-sm flex-col items-center justify-center px-6 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">Wardrobe Matcher</h1>
      <p className="mt-1 text-sm text-black/60 dark:text-white/60">
        Sign in to your closet.
      </p>
      <form
        action={async () => {
          "use server";
          await signIn("google", { redirectTo: "/" });
        }}
        className="mt-6 w-full"
      >
        <button
          type="submit"
          className="w-full rounded-full bg-foreground px-5 py-3 text-sm font-medium text-background transition-opacity hover:opacity-90"
        >
          Continue with Google
        </button>
      </form>
    </div>
  );
}

import Link from "next/link";

export default function AssistantPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
      <h1 className="text-2xl font-semibold tracking-tight">Stylist ✨</h1>
      <p className="mt-2 text-sm text-black/60 dark:text-white/60">
        Chat with your stylist is on its way. In the meantime, open any item and tap{" "}
        <span className="font-medium">Suggest matches</span>.
      </p>
      <Link href="/" className="mt-6 inline-block text-sm font-medium hover:underline">
        ← Back to closet
      </Link>
    </div>
  );
}

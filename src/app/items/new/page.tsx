import Link from "next/link";
import { createItem } from "@/lib/actions";
import { ItemForm } from "@/app/_components/ItemForm";

export default function NewItemPage() {
  return (
    <div className="mx-auto w-full max-w-lg px-4 py-6 sm:px-6 sm:py-8">
      <Link href="/" className="inline-block py-1 text-sm text-black/50 hover:underline dark:text-white/50">
        ← Back to closet
      </Link>
      <h1 className="mb-6 mt-3 text-2xl font-semibold tracking-tight">Add item</h1>
      <ItemForm action={createItem} submitLabel="Add item" />
    </div>
  );
}

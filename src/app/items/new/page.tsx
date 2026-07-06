import Link from "next/link";
import { createItem } from "@/lib/actions";
import { ItemForm } from "@/app/_components/ItemForm";

export default function NewItemPage() {
  return (
    <div className="mx-auto w-full max-w-lg px-6 py-8">
      <Link href="/" className="text-sm text-black/50 hover:underline dark:text-white/50">
        ← Back to closet
      </Link>
      <h1 className="mb-6 mt-3 text-2xl font-semibold tracking-tight">Add item</h1>
      <ItemForm action={createItem} submitLabel="Add item" />
    </div>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { getItem } from "@/lib/items";
import { updateItem } from "@/lib/actions";
import { ItemForm } from "@/app/_components/ItemForm";

export default async function EditItemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const item = await getItem(id);
  if (!item) notFound();

  return (
    <div className="mx-auto w-full max-w-lg px-6 py-8">
      <Link href="/" className="text-sm text-black/50 hover:underline dark:text-white/50">
        ← Back to closet
      </Link>
      <h1 className="mb-6 mt-3 text-2xl font-semibold tracking-tight">Edit item</h1>

      <ItemForm action={updateItem} defaults={item} submitLabel="Save changes" />
    </div>
  );
}

"use client";

import { useFormStatus } from "react-dom";
import { ItemMultiSelect, type PickItem } from "./ItemMultiSelect";

const inputClass =
  "w-full rounded-md border border-black/15 bg-background text-foreground px-3 py-2.5 text-sm outline-none focus:border-foreground dark:border-white/20";

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-full bg-foreground px-5 py-3 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-50 sm:w-auto"
    >
      {pending ? "Saving…" : label}
    </button>
  );
}

export function OutfitForm({
  action,
  items,
  defaults,
  submitLabel,
}: {
  action: (formData: FormData) => void | Promise<void>;
  items: PickItem[];
  defaults?: { id?: string; name?: string; notes?: string | null; itemIds?: string[] };
  submitLabel: string;
}) {
  return (
    <form action={action} className="flex flex-col gap-5">
      {defaults?.id && <input type="hidden" name="id" value={defaults.id} />}

      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Name
        <input
          name="name"
          required
          defaultValue={defaults?.name ?? ""}
          placeholder="Weekend casual"
          className={inputClass}
        />
      </label>

      <div>
        <p className="mb-2 text-sm font-medium">Items</p>
        <ItemMultiSelect items={items} defaultSelected={defaults?.itemIds ?? []} />
      </div>

      <div className="pt-1">
        <SubmitButton label={submitLabel} />
      </div>
    </form>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { CATEGORIES } from "@/lib/types";

export type ItemFormDefaults = {
  id?: string;
  name?: string;
  category?: string;
  subtype?: string;
  color?: string | null;
  notes?: string | null;
  sourceUrl?: string | null;
  imagePath?: string | null;
};

const inputClass =
  "w-full rounded-md border border-black/15 bg-background text-foreground px-3 py-2 text-sm outline-none focus:border-foreground dark:border-white/20";
const labelClass = "flex flex-col gap-1.5 text-sm font-medium";

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

/** Photo field: accepts a pasted image (Ctrl/Cmd+V), a dropped file, or a picked
 * file, and mirrors it into a hidden <input type="file" name="image"> so the
 * existing server action receives it unchanged. */
function ImageField({ initialImagePath }: { initialImagePath?: string | null }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const objectUrlRef = useRef<string | null>(null);
  const [preview, setPreview] = useState<string | null>(initialImagePath ?? null);
  const [dragging, setDragging] = useState(false);

  const applyFile = (raw: File | null | undefined) => {
    if (!raw || !raw.type.startsWith("image/")) return;
    // Clipboard images can arrive with an empty filename, which multipart form
    // parsing drops — give it a name so it always uploads.
    const file = raw.name
      ? raw
      : new File([raw], `pasted.${raw.type.split("/")[1] || "png"}`, { type: raw.type });
    // Put the file into the hidden input so it submits with the form.
    const dt = new DataTransfer();
    dt.items.add(file);
    if (fileInputRef.current) fileInputRef.current.files = dt.files;
    // Swap the preview to the new file.
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    objectUrlRef.current = URL.createObjectURL(file);
    setPreview(objectUrlRef.current);
  };

  const clear = () => {
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    setPreview(initialImagePath ?? null);
  };

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith("image/")) {
          const file = items[i].getAsFile();
          if (file) {
            applyFile(file);
            e.preventDefault();
            break;
          }
        }
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, []);

  // Revoke the last object URL when unmounting.
  useEffect(
    () => () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    },
    [],
  );

  const showClear = preview !== null && preview !== (initialImagePath ?? null);
  const openPicker = () => fileInputRef.current?.click();

  return (
    <div className={labelClass}>
      <span>
        Photo <span className="font-normal text-black/50 dark:text-white/50">(optional)</span>
      </span>

      {/* The whole box is tappable — on a phone this opens the camera or photo library. */}
      <div
        role="button"
        tabIndex={0}
        onClick={openPicker}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            openPicker();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          applyFile(e.dataTransfer.files?.[0]);
        }}
        className={`flex cursor-pointer items-center gap-4 rounded-md border border-dashed p-3 transition-colors ${
          dragging
            ? "border-foreground bg-black/5 dark:bg-white/10"
            : "border-black/20 hover:border-foreground dark:border-white/25"
        }`}
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="Selected photo preview" className="h-20 w-20 shrink-0 rounded object-cover" />
        ) : (
          <div className="grid h-20 w-20 shrink-0 place-items-center rounded bg-black/5 text-xs text-black/40 dark:bg-white/10 dark:text-white/40">
            No image
          </div>
        )}

        <div className="flex flex-col items-start gap-1">
          <span className="text-sm font-medium">{preview ? "Change photo" : "Add a photo"}</span>
          <span className="text-xs text-black/50 dark:text-white/50">
            Tap to take a photo or pick one. On a computer you can also paste or drag an image.
          </span>
          {showClear && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                clear();
              }}
              className="mt-1 rounded px-1 py-0.5 text-xs font-medium text-red-600 hover:underline dark:text-red-400"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      <input
        ref={fileInputRef}
        name="image"
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => applyFile(e.target.files?.[0])}
      />
    </div>
  );
}

export function ItemForm({
  action,
  defaults = {},
  submitLabel,
}: {
  action: (formData: FormData) => void | Promise<void>;
  defaults?: ItemFormDefaults;
  submitLabel: string;
}) {
  return (
    <form action={action} className="flex max-w-lg flex-col gap-5">
      {defaults.id && <input type="hidden" name="id" value={defaults.id} />}

      <label className={labelClass}>
        Name
        <input
          name="name"
          required
          defaultValue={defaults.name ?? ""}
          placeholder="Blue Oxford shirt"
          className={inputClass}
        />
      </label>

      <div className="grid grid-cols-2 gap-4">
        <label className={labelClass}>
          Category
          <select
            name="category"
            required
            defaultValue={defaults.category ?? ""}
            className={inputClass}
          >
            <option value="" disabled>
              Choose…
            </option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c.charAt(0) + c.slice(1).toLowerCase()}
              </option>
            ))}
          </select>
        </label>

        <label className={labelClass}>
          Subtype
          <input
            name="subtype"
            required
            defaultValue={defaults.subtype ?? ""}
            placeholder="dress shirt"
            className={inputClass}
          />
        </label>
      </div>

      <label className={labelClass}>
        Color <span className="font-normal text-black/50 dark:text-white/50">(optional)</span>
        <input
          name="color"
          defaultValue={defaults.color ?? ""}
          placeholder="blue"
          className={inputClass}
        />
      </label>

      <ImageField initialImagePath={defaults.imagePath} />

      <label className={labelClass}>
        Notes <span className="font-normal text-black/50 dark:text-white/50">(optional)</span>
        <textarea
          name="notes"
          rows={2}
          defaultValue={defaults.notes ?? ""}
          className={inputClass}
        />
      </label>

      <div className="pt-1">
        <SubmitButton label={submitLabel} />
      </div>
    </form>
  );
}

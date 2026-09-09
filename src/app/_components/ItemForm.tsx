"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { upload } from "@vercel/blob/client";
import { CATEGORIES } from "@/lib/types";
import type { ItemActionResult } from "@/lib/actions";

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
  "w-full rounded-md border border-black/15 bg-background text-foreground px-3 py-2.5 text-base outline-none focus:border-foreground dark:border-white/20";
const labelClass = "flex flex-col gap-1.5 text-sm font-medium";

// Phone photos are often several MB — larger than the Server Action / upload
// body limits — so a full-size upload silently arrives truncated and the image
// never saves. Downscale and re-encode in the browser first: this keeps uploads
// small and reliable, and (as a bonus) applies EXIF orientation and converts
// iPhone HEIC to JPEG so the photo isn't sideways or unviewable.
const MAX_DIMENSION = 1600;
const OUTPUT_TYPE = "image/jpeg";
const OUTPUT_QUALITY = 0.85;

async function downscaleImage(file: File): Promise<File> {
  // Animated GIFs would be flattened to a single frame — leave them as-is.
  if (file.type === "image/gif") return file;
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close();
      return file;
    }
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, OUTPUT_TYPE, OUTPUT_QUALITY),
    );
    if (!blob) return file;
    // If re-encoding didn't actually shrink an already-small JPEG, keep the original.
    if (blob.size >= file.size && file.type === OUTPUT_TYPE) return file;

    const baseName = file.name.replace(/\.[^.]+$/, "") || "photo";
    return new File([blob], `${baseName}.jpg`, { type: OUTPUT_TYPE });
  } catch {
    // Browser can't decode this format (e.g. HEIC off Safari) — send the original.
    return file;
  }
}

/** Photo field: accepts a pasted / dropped / picked image, shows a preview, and
 * reports the chosen File up to the form (kept in React state so it survives a
 * failed save). */
function ImageField({
  initialImagePath,
  onFile,
}: {
  initialImagePath?: string | null;
  onFile: (file: File | null) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const objectUrlRef = useRef<string | null>(null);
  const [preview, setPreview] = useState<string | null>(initialImagePath ?? null);
  const [dragging, setDragging] = useState(false);

  const applyFile = async (raw: File | null | undefined) => {
    if (!raw || !raw.type.startsWith("image/")) return;
    const named = raw.name
      ? raw
      : new File([raw], `pasted.${raw.type.split("/")[1] || "png"}`, { type: raw.type });
    const file = await downscaleImage(named);
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    objectUrlRef.current = URL.createObjectURL(file);
    setPreview(objectUrlRef.current);
    onFile(file);
  };

  const clear = () => {
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    setPreview(initialImagePath ?? null);
    onFile(null);
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

  useEffect(
    () => () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    },
    [],
  );

  const showClear = preview !== null && preview !== (initialImagePath ?? null);

  return (
    <div className={labelClass}>
      <span>
        Photo{" "}
        <span className="font-normal text-black/50 dark:text-white/50">
          — paste, drag, or choose a file
        </span>
      </span>

      <div
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
        className={`flex items-center gap-4 rounded-md border border-dashed p-3 transition-colors ${
          dragging ? "border-foreground bg-black/5 dark:bg-white/10" : "border-black/20 dark:border-white/25"
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

        <div className="flex flex-col items-start gap-1.5 text-xs">
          <span className="text-black/50 dark:text-white/50">Paste an image, drop one here, or</span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="rounded-full border border-black/20 px-3 py-1 font-medium hover:border-foreground dark:border-white/25"
            >
              Choose file
            </button>
            {showClear && (
              <button
                type="button"
                onClick={clear}
                className="font-medium text-red-600 hover:underline dark:text-red-400"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      <input
        ref={fileInputRef}
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
  action: (formData: FormData) => Promise<ItemActionResult>;
  defaults?: ItemFormDefaults;
  submitLabel: string;
}) {
  // Controlled fields so a failed save keeps everything the user entered.
  const [name, setName] = useState(defaults.name ?? "");
  const [category, setCategory] = useState(defaults.category ?? "");
  const [subtype, setSubtype] = useState(defaults.subtype ?? "");
  const [color, setColor] = useState(defaults.color ?? "");
  const [notes, setNotes] = useState(defaults.notes ?? "");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      try {
        // Upload the (already-downscaled) photo straight to Blob from the
        // browser, then hand the Server Action just the resulting URL. The file
        // bytes never go through the action, so upload size isn't capped by the
        // action/request-body limits.
        let imageUrl: string | null = null;
        if (imageFile) {
          const uploaded = await upload(`items/${imageFile.name}`, imageFile, {
            access: "public",
            handleUploadUrl: "/api/blob/upload",
            contentType: imageFile.type,
          });
          imageUrl = uploaded.url;
        }

        const fd = new FormData();
        if (defaults.id) fd.set("id", defaults.id);
        fd.set("name", name);
        fd.set("category", category);
        fd.set("subtype", subtype);
        fd.set("color", color);
        fd.set("notes", notes);
        if (imageUrl) fd.set("imageUrl", imageUrl);

        const result = await action(fd);
        // On success the action redirects; on failure it returns an error.
        if (result?.error) setError(result.error);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      }
    });
  };

  return (
    <form onSubmit={onSubmit} className="flex max-w-lg flex-col gap-5">
      {error && (
        <p className="rounded-md bg-red-500/10 px-3 py-2 text-sm font-medium text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      <label className={labelClass}>
        Name
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          placeholder="Blue Oxford shirt"
          className={inputClass}
        />
      </label>

      <div className="grid grid-cols-2 gap-4">
        <label className={labelClass}>
          Category
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            required
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
            value={subtype}
            onChange={(e) => setSubtype(e.target.value)}
            required
            placeholder="dress shirt"
            className={inputClass}
          />
        </label>
      </div>

      <label className={labelClass}>
        Color <span className="font-normal text-black/50 dark:text-white/50">(optional)</span>
        <input
          value={color}
          onChange={(e) => setColor(e.target.value)}
          placeholder="blue"
          className={inputClass}
        />
      </label>

      <ImageField initialImagePath={defaults.imagePath} onFile={setImageFile} />

      <label className={labelClass}>
        Notes <span className="font-normal text-black/50 dark:text-white/50">(optional)</span>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className={inputClass}
        />
      </label>

      <div className="pt-1">
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-full bg-foreground px-5 py-3 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-50 sm:w-auto"
        >
          {pending ? "Saving…" : submitLabel}
        </button>
      </div>
    </form>
  );
}

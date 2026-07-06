import { mkdir, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { put, del } from "@vercel/blob";

// Locally we write to /public/uploads (served at /uploads/<file>). In production
// (Vercel), the filesystem is read-only, so we use Vercel Blob instead — detected
// by the presence of BLOB_READ_WRITE_TOKEN, which Vercel injects automatically.
const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");
const useBlob = () => Boolean(process.env.BLOB_READ_WRITE_TOKEN);

const MIME_EXT: Record<string, string> = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "image/avif": ".avif",
};

function filenameFor(file: File): string {
  // Pasted images often have no filename, so fall back to the MIME type.
  const ext = path.extname(file.name) || MIME_EXT[file.type] || ".jpg";
  return `${randomUUID()}${ext}`;
}

/** Save an image and return its URL/path (a Blob URL in prod, "/uploads/…" in dev). */
export async function saveImage(file: File): Promise<string> {
  const filename = filenameFor(file);

  if (useBlob()) {
    const { url } = await put(`uploads/${filename}`, file, { access: "public" });
    return url;
  }

  await mkdir(UPLOAD_DIR, { recursive: true });
  const bytes = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(UPLOAD_DIR, filename), bytes);
  return `/uploads/${filename}`;
}

/** Remove a previously saved image. Handles both Blob URLs and local paths. */
export async function deleteImage(imagePath: string | null): Promise<void> {
  if (!imagePath) return;

  if (imagePath.startsWith("http")) {
    try {
      await del(imagePath);
    } catch {
      // Already gone — nothing to clean up.
    }
    return;
  }

  if (imagePath.startsWith("/uploads/")) {
    try {
      await unlink(path.join(process.cwd(), "public", imagePath));
    } catch {
      // Already gone — nothing to clean up.
    }
  }
}

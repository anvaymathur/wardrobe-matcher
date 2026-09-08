import { unlink } from "node:fs/promises";
import path from "node:path";
import { del } from "@vercel/blob";

// Item photos are uploaded to Vercel Blob directly from the browser (see
// /api/blob/upload and ItemForm). The server only needs to delete a blob when an
// image is replaced or its item is removed.

/** Remove a previously saved image. Handles Blob URLs and legacy local paths. */
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

  // Older items may still reference a dev-only /public/uploads file.
  if (imagePath.startsWith("/uploads/")) {
    try {
      await unlink(path.join(process.cwd(), "public", imagePath));
    } catch {
      // Already gone — nothing to clean up.
    }
  }
}

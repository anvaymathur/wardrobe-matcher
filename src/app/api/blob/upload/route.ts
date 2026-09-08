import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { getCurrentUserId } from "@/lib/currentUser";

// Client uploads go straight from the browser to Vercel Blob, so the photo
// never passes through a Server Action (avoiding the request-body limits and
// not tying up a function streaming bytes). This route only mints a short-lived,
// scoped upload token — the browser does the actual upload with it.
//
// Two kinds of request hit this route:
//   1. token generation — from the signed-in browser (has the session cookie),
//      gated by onBeforeGenerateToken below.
//   2. the upload-completed webhook — server-to-server from Vercel Blob (no
//      cookie), verified by handleUpload via the token signature. The item's
//      row is written by the create/update Server Action using the returned
//      URL, so there is nothing to persist here.
export async function POST(request: Request): Promise<Response> {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const result = await handleUpload({
      request,
      body,
      onBeforeGenerateToken: async () => {
        const userId = await getCurrentUserId();
        if (!userId) throw new Error("Not authenticated");
        return {
          allowedContentTypes: ["image/*"],
          maximumSizeInBytes: 15 * 1024 * 1024, // photos are downscaled client-side first
          addRandomSuffix: true, // unique pathname, never overwrite
          tokenPayload: JSON.stringify({ userId }),
        };
      },
      onUploadCompleted: async () => {
        // Intentionally empty — the DB row is written by the Server Action.
      },
    });

    return Response.json(result);
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Upload failed" },
      { status: 400 },
    );
  }
}

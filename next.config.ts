import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Pin the workspace root to this project. Without this, a stray lockfile in a
// parent directory makes Next infer the wrong root (see the multi-lockfile warning).
const projectRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  turbopack: {
    root: projectRoot,
  },
  // Item photos upload directly from the browser to Vercel Blob (see
  // /api/blob/upload), so nothing large flows through a Server Action and the
  // default body limit is fine.
};

export default nextConfig;

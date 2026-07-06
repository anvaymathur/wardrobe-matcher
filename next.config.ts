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
  experimental: {
    // Item photos are uploaded through a Server Action; the default cap is 1MB,
    // which a pasted screenshot easily exceeds. Allow larger images.
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;

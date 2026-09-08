import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    globalSetup: ["./test/globalSetup.ts"],
    setupFiles: ["./test/setup.ts"],
    // Tests share one SQLite test database, so don't run files in parallel.
    fileParallelism: false,
    env: { DATABASE_URL: "file:./prisma/test.db" },
  },
});

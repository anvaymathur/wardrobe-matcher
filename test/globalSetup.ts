import { execSync } from "node:child_process";
import { rmSync } from "node:fs";

// Create a fresh SQLite test database with the current schema before tests run.
export default function setup() {
  try {
    rmSync("prisma/test.db");
  } catch {
    // no existing test db — fine
  }
  execSync('npx prisma db push --accept-data-loss --url "file:./prisma/test.db"', {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: "file:./prisma/test.db" },
  });
}

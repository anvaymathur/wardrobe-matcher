// Shared session helpers used by both the edge middleware and the server
// actions. Uses Web Crypto (available in both runtimes) so we never store the
// raw password — the cookie holds a SHA-256 token instead.

export const SESSION_COOKIE = "wm_session";

async function hash(password: string): Promise<string> {
  const data = new TextEncoder().encode(`wm:${password}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Token for the configured password, or null when no password is set (gate off). */
export async function expectedToken(): Promise<string | null> {
  const password = process.env.APP_PASSWORD;
  return password ? hash(password) : null;
}

/** Token for a password a user just submitted. */
export function tokenForPassword(password: string): Promise<string> {
  return hash(password);
}

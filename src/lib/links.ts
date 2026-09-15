/** Product links are rendered as clickable links and shown to the AI, so only
 * plain http(s) addresses are accepted. Returns null when empty, false when invalid. */
export function readProductLink(raw: string): string | null | false {
  const value = raw.trim();
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") return false;
    return url.toString().slice(0, 2000);
  } catch {
    return false;
  }
}

/** "www.uniqlo.com" → "uniqlo.com", for "View on {store}" labels. */
export function storeName(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "store";
  }
}

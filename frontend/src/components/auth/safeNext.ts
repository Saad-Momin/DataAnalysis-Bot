/** Returns `next` only if it is a same-site relative path, otherwise `fallback`. */
export function safeNext(next: string | null | undefined, fallback = "/app"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("\\")) return fallback;
  // reject control characters (header/URL smuggling)
  for (let i = 0; i < next.length; i++) if (next.charCodeAt(i) < 32) return fallback;
  return next;
}
